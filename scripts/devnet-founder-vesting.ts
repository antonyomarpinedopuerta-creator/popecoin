import { devnetIdl, loadDevnetKeypair } from "./devnet-config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const idl = require("../target/idl/popecoin_vesting.json");

const payer = loadDevnetKeypair("PAYER");

const founder = loadDevnetKeypair("FOUNDER");

const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const program = new anchor.Program(devnetIdl(idl), provider);

const mint = new PublicKey(
  "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
);

const [vesting] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vesting"),
    founder.publicKey.toBuffer(),
    mint.toBuffer(),
  ],
  program.programId
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vesting.toBuffer()],
  program.programId
);

// DEVNET ONLY.
// This script initializes a vesting PDA and therefore changes on-chain state.
// Do not reuse as a Mainnet deployment script without explicit fixed timestamps
// and a final verification of beneficiary, mint, amount and authorities.
async function main() {
  const now = Math.floor(Date.now() / 1000);

  // Scheduled allocation: 1,000,000 PAPA, 6 decimals
  const amount = new anchor.BN(1_000_000_000_000);

  // DEVNET schedule generated at execution time: cliff 180 días, duration 730 días.
  const start = new anchor.BN(now);
  const cliff = new anchor.BN(now + 180 * 24 * 60 * 60);
  const end = new anchor.BN(now + 730 * 24 * 60 * 60);

  console.log("Beneficiary:", founder.publicKey.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Amount: 1,000,000 PAPA");
  console.log("Start:", start.toString());
  console.log("Cliff:", cliff.toString());
  console.log("End:", end.toString());

  const signature = await program.methods
    .initialize(amount, start, cliff, end)
    .accounts({
      payer: payer.publicKey,
      authority: founder.publicKey,
      beneficiary: founder.publicKey,
      mint,
      vesting,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([founder])
    .rpc();

  console.log("INITIALIZE SUCCESS");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error("INITIALIZE FAILED");
  console.error(error);
  process.exit(1);
});
