import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

const idl = require("../target/idl/popecoin_vesting.json");

const payer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")
    )
  )
);

const development = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(process.env.HOME + "/pope-development.json", "utf8")
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

  const amount = new anchor.BN(100_000_000);

  console.log("Development:", development.publicKey.toBase58());
  console.log("Development ATA:", developmentAta.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Depositing: 100 PAPA");

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
