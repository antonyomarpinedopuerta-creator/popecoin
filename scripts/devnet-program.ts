import { createHash } from "crypto";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM_ID } from "./devnet-config";
import { createDevnetConnection } from "./vesting-reader";

export const UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
export const [PROGRAM_DATA] = PublicKey.findProgramAddressSync([DEVNET_PROGRAM_ID.toBuffer()], UPGRADEABLE_LOADER);
const HISTORICAL_SIZE = 233096;
const HISTORICAL_SHA256 = "d0b317c25e76a31f323dc772358ba8ba0e5a6511bd9fdec22148b2cc6bbed47d";

export function inspectProgram(program: AccountInfo<Buffer> | null, data: AccountInfo<Buffer> | null) {
  if (!program || !program.executable || !program.owner.equals(UPGRADEABLE_LOADER) ||
      program.data.length !== 36 || program.data.readUInt32LE(0) !== 2 ||
      !new PublicKey(program.data.subarray(4)).equals(PROGRAM_DATA)) throw new Error("Invalid Devnet program account");
  if (!data || data.executable || !data.owner.equals(UPGRADEABLE_LOADER) || data.data.length < 49 ||
      data.data.readUInt32LE(0) !== 3 || ![0, 1].includes(data.data[12])) throw new Error("Invalid Devnet ProgramData");
  const executable = data.data.subarray(45);
  if (!executable.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) throw new Error("ProgramData does not contain ELF");
  const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  const historicalMatch = executable.length >= HISTORICAL_SIZE &&
    sha256(executable.subarray(0, HISTORICAL_SIZE)) === HISTORICAL_SHA256 &&
    executable.subarray(HISTORICAL_SIZE).every(byte => byte === 0);
  return { program: DEVNET_PROGRAM_ID.toBase58(), programData: PROGRAM_DATA.toBase58(),
    deployedSlot: data.data.readBigUInt64LE(4).toString(), upgradeAuthorityActive: data.data[12] === 1,
    allocatedExecutableBytes: executable.length, allocatedExecutableSha256: sha256(executable),
    historicalMatch, historicalSourceCommit: "990cd9ed0126c81e178a7156ce1bf416c412d28b",
    note: "Historical comparison only; the current local candidate has not been deployed" };
}

export async function readDevnetProgram(connection = createDevnetConnection()) {
  const { context, value } = await connection.getMultipleAccountsInfoAndContext([DEVNET_PROGRAM_ID, PROGRAM_DATA], "confirmed");
  return { cluster: "devnet", observedAt: new Date().toISOString(), slot: context.slot, ...inspectProgram(value[0], value[1]) };
}
if (require.main === module) {
  readDevnetProgram().then(value => console.log(JSON.stringify(value, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
