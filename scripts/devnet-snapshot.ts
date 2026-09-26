import { PublicKey } from "@solana/web3.js";
import { BENEFICIARIES, readVesting } from "./vesting-reader";

async function main() {
  const snapshots = [];
  // Sequential requests to avoid overwhelming the public Devnet endpoint.
  for (const [role, address] of Object.entries(BENEFICIARIES)) {
    snapshots.push({ role, ...await readVesting(new PublicKey(address)) });
  }
  console.log(JSON.stringify({ observedAt: new Date().toISOString(), snapshots }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
