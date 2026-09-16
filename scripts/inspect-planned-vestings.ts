import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const idl = require("../target/idl/popecoin_vesting.json");

const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

const provider = new anchor.AnchorProvider(
  connection,
  {} as anchor.Wallet,
  { commitment: "confirmed" }
);

const program = new anchor.Program(idl, provider);

const mint = new PublicKey(
  "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
);

const reserve = new PublicKey(
  "HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa"
);

const founder = new PublicKey(
  "DuvtonEx95RYtTXiUUaUpz1t4PuRHRDGAVB6wD29EfT3"
);

function inspect(label: string, beneficiary: PublicKey) {
  const [vesting] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vesting"),
      beneficiary.toBuffer(),
      mint.toBuffer(),
    ],
    program.programId
  );

  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vesting.toBuffer()],
    program.programId
  );

  console.log(`\n=== ${label} ===`);
  console.log("Beneficiary:", beneficiary.toBase58());
  console.log("Vesting PDA:", vesting.toBase58());
  console.log("Vault PDA:", vault.toBase58());
}

console.log("Program:", program.programId.toBase58());
console.log("Mint:", mint.toBase58());

inspect("RESERVE — 3,000,000 POPE", reserve);
inspect("FOUNDER — 1,000,000 POPE", founder);
