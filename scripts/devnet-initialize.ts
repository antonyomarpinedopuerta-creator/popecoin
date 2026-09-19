import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

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
  const now = Math.floor(Date.now() / 1000);

  // Prueba: 100 PAPA, 6 decimales
  const amount = new anchor.BN(100_000_000);

  // Margen suficiente para realizar deposit y probar el cliff.
  const start = new anchor.BN(now);
  const cliff = new anchor.BN(now + 600);
  const end = new anchor.BN(now + 1200);

  console.log("Beneficiary:", development.publicKey.toBase58());
  console.log("Vesting:", vesting.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log("Amount: 100 PAPA");
  console.log("Start:", start.toString());
  console.log("Cliff:", cliff.toString());
  console.log("End:", end.toString());

  const signature = await program.methods
    .initialize(amount, start, cliff, end)
    .accounts({
      payer: payer.publicKey,
      authority: development.publicKey,
      beneficiary: development.publicKey,
      mint,
      vesting,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([development])
    .rpc();

  console.log("INITIALIZE SUCCESS");
  console.log("Signature:", signature);
}

main().catch((error) => {
  console.error("INITIALIZE FAILED");
  console.error(error);
  process.exit(1);
});
