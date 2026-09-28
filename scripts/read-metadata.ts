import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey, MaybeRpcAccount } from "@metaplex-foundation/umi";
import { mplTokenMetadata, findMetadataPda, deserializeMetadata, MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { DEVNET_RPC, DEVNET_MINT } from "./devnet-config";

export function inspectMetadata(account: MaybeRpcAccount) {
  const umi = createUmi(DEVNET_RPC).use(mplTokenMetadata());
  const mint = publicKey(DEVNET_MINT.toBase58());
  const pda = findMetadataPda(umi, { mint });
  if (!account.exists || account.publicKey !== pda[0] || account.executable || account.owner !== MPL_TOKEN_METADATA_PROGRAM_ID) throw new Error("Invalid metadata account owner");
  const metadata = deserializeMetadata(account);
  const expectedUri = "https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/metadata.json";
  if (metadata.key !== 4 || metadata.mint !== mint || metadata.name !== "PAPA" || metadata.symbol !== "PAPA" || metadata.uri !== expectedUri) {
    throw new Error("Unexpected Devnet metadata identity or URI");
  }
  return { cluster: "devnet", observedAt: new Date().toISOString(), address: metadata.publicKey,
    mint, name: metadata.name, symbol: metadata.symbol, uri: metadata.uri, mutable: metadata.isMutable,
    note: "Historical Devnet metadata; production publication and authority policy pending" };
}
export async function readMetadata() {
  const umi = createUmi(DEVNET_RPC).use(mplTokenMetadata());
  const [pda] = findMetadataPda(umi, { mint: publicKey(DEVNET_MINT.toBase58()) });
  return inspectMetadata(await umi.rpc.getAccount(pda, { commitment: "confirmed", signal: AbortSignal.timeout(12000) }));
}
if (require.main === module) readMetadata().then(value => console.log(JSON.stringify(value, null, 2)))
  .catch(() => { console.error("Devnet metadata verification failed"); process.exitCode = 1; });
