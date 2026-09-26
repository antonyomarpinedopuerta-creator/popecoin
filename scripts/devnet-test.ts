import { PublicKey } from "@solana/web3.js";

import { DEVNET_PROGRAM_ID as PROGRAM_ID, DEVNET_MINT as PAPA_MINT } from "./devnet-config";
import { createDevnetConnection } from "./vesting-reader";

const connection = createDevnetConnection();

async function main() {
  const version = await connection.getVersion();

  console.log("PAPA Devnet client connected");
  console.log("Solana version:", version["solana-core"]);
  console.log("Program:", PROGRAM_ID.toBase58());
  console.log("PAPA mint:", PAPA_MINT.toBase58());
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

// PDA de prueba usando Development como beneficiario
const DEVELOPMENT = new PublicKey(
  "7RmjKf4HBDHqopxQf4RCtyb1gMribrd29hDiLZWauRyc"
);

const [VESTING_PDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vesting"),
    DEVELOPMENT.toBuffer(),
    PAPA_MINT.toBuffer(),
  ],
  PROGRAM_ID
);

const [VAULT_PDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vault"),
    VESTING_PDA.toBuffer(),
  ],
  PROGRAM_ID
);

console.log("Vesting PDA:", VESTING_PDA.toBase58());
console.log("Vault PDA:", VAULT_PDA.toBase58());
