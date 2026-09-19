import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

const idl = require("../target/idl/popecoin_vesting.json");

// DEVNET ONLY.
// This script moves tokens into a vesting vault.
// Verify network, mint, authority, beneficiary, amount and PDA before execution.

const payer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")
    )
  )
);

const beneficiary = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(process.env.HOME + "/pope-reserve.json", "utf8")
    )
  )
);

const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(payer),
  { commitment: "confirmed" }
);

const program = new anchor.Program(idl, provider);

const mint = new PublicKey(
  "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
);

const [vesting] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vesting"),
    beneficiary.publicKey.toBuffer(),
    mint.toBuffer(),
  ],
  program.programId
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vesting.toBuffer()],
  program.programId
);

async function main() {
  const authorityTokenAccount = await getAssociatedTokenAddress(
    mint,
    beneficiary.publicKey
  );

  const amount = new anchor.BN(3_000_000_000_000);

  console.log("=== RESERVE DEVNET DEPOSIT ===");
  console.log("Program:", program.programId.toBase58());
  console.log("Mint:", mint.toBase58());
  console.log("Authority:", beneficiary.publicKey.toBase58());
  console.log("Authority ATA:", authorityTokenAccount.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Amount: 3,000,000 PAPA");

  const signature = await program.methods
    .deposit(amount)
    .accounts({
      vesting,
      vault,
      authority: beneficiary.publicKey,
      mint,
      authorityTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([beneficiary])
    .rpc();

  console.log("DEPOSIT SUCCESS");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error("DEPOSIT FAILED");
  console.error(error);
  process.exit(1);
});
