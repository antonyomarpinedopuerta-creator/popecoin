import { devnetIdl, loadDevnetKeypair } from "./devnet-config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
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

  console.log("Beneficiary:", development.publicKey.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());

  const signature = await program.methods
    .release()
    .accounts({
      vesting,
      vault,
      beneficiary: development.publicKey,
      mint,
      beneficiaryTokenAccount: developmentAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([development])
    .rpc();

  console.log("RELEASE SUCCESS");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error("RELEASE FAILED");
  console.error(error);
  process.exit(1);
});
