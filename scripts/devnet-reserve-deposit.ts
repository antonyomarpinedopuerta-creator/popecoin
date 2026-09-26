import { devnetIdl, loadDevnetKeypair, remainingDepositAmount } from "./devnet-config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const idl = require("../target/idl/popecoin_vesting.json");

// DEVNET ONLY.
// This script moves tokens into a vesting vault.
// Verify network, mint, authority, beneficiary, amount and PDA before execution.

const payer = loadDevnetKeypair("PAYER");

const beneficiary = loadDevnetKeypair("RESERVE");

const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(payer),
  { commitment: "confirmed" }
);

const program = new anchor.Program(devnetIdl(idl), provider);

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

  const vaultState = await getAccount(connection, vault);
  if (!vaultState.mint.equals(mint) || !vaultState.owner.equals(vesting)) {
    throw new Error("Unexpected vault mint or authority");
  }
  const amount = new anchor.BN(remainingDepositAmount(3000000000000n, vaultState.amount).toString());
  console.log("Actual deposit (base units):", amount.toString());

  console.log("=== RESERVE DEVNET DEPOSIT ===");
  console.log("Program:", program.programId.toBase58());
  console.log("Mint:", mint.toBase58());
  console.log("Authority:", beneficiary.publicKey.toBase58());
  console.log("Authority ATA:", authorityTokenAccount.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Scheduled total: 3,000,000 PAPA");

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
