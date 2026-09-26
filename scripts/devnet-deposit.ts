import { devnetIdl, loadDevnetKeypair, remainingDepositAmount } from "./devnet-config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const idl = require("../target/idl/popecoin_vesting.json");

const payer = loadDevnetKeypair("PAYER");

const development = loadDevnetKeypair("DEVELOPMENT");

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
    development.publicKey.toBuffer(),
    mint.toBuffer(),
  ],
  program.programId
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vesting.toBuffer()],
  program.programId
);

async function main() {
  const developmentAta = await getAssociatedTokenAddress(
    mint,
    development.publicKey
  );

  const vaultState = await getAccount(connection, vault);
  if (!vaultState.mint.equals(mint) || !vaultState.owner.equals(vesting)) {
    throw new Error("Unexpected vault mint or authority");
  }
  const amount = new anchor.BN(remainingDepositAmount(100000000n, vaultState.amount).toString());
  console.log("Actual deposit (base units):", amount.toString());

  console.log("Development:", development.publicKey.toBase58());
  console.log("Development ATA:", developmentAta.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Scheduled total: 100 PAPA");

  const signature = await program.methods
    .deposit(amount)
    .accounts({
      vesting,
      vault,
      authority: development.publicKey,
      mint,
      authorityTokenAccount: developmentAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([development])
    .rpc();

  console.log("DEPOSIT SUCCESS");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error("DEPOSIT FAILED");
  console.error(error);
  process.exit(1);
});
