import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

const RPC_URL = "https://api.devnet.solana.com";

const PROGRAM_ID = new PublicKey(
  "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
);

const POPE_MINT = new PublicKey(
  "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
);

const connection = new Connection(RPC_URL, "confirmed");

async function main() {
  const version = await connection.getVersion();

  console.log("POPECOIN Devnet client connected");
  console.log("Solana version:", version["solana-core"]);
  console.log("Program:", PROGRAM_ID.toBase58());
  console.log("POPE mint:", POPE_MINT.toBase58());
}

main().catch(console.error);

// PDA de prueba usando Development como beneficiario
const DEVELOPMENT = new PublicKey(
  "7RmjKf4HBDHqopxQf4RCtyb1gMribrd29hDiLZWauRyc"
);

const [VESTING_PDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vesting"),
    DEVELOPMENT.toBuffer(),
    POPE_MINT.toBuffer(),
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
