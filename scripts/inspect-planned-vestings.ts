import { PublicKey } from "@solana/web3.js";
import { BENEFICIARIES, readVesting } from "./vesting-reader";

async function main() {
  for (const [role, address] of Object.entries(BENEFICIARIES)) {
    console.log(JSON.stringify({ role, ...await readVesting(new PublicKey(address)) }, null, 2));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
