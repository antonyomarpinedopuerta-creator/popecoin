import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

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

async function inspect(label: string, beneficiary: PublicKey) {
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

  const account = await (program.account as any).vestingAccount.fetch(vesting);

  console.log("Authority:", account.authority.toBase58());
  console.log("On-chain beneficiary:", account.beneficiary.toBase58());
  console.log("On-chain mint:", account.mint.toBase58());
  console.log("Total amount:", account.totalAmount.toString());
  console.log("Released amount:", account.releasedAmount.toString());
  console.log("Start time:", account.startTime.toString());
  console.log("Cliff time:", account.cliffTime.toString());
  console.log("End time:", account.endTime.toString());
  console.log("Bump:", account.bump);

  const vaultAccount = await getAccount(connection, vault);
  console.log("Vault balance (raw):", vaultAccount.amount.toString());
  console.log("Vault balance (PAPA):", Number(vaultAccount.amount) / 1_000_000);
}

async function main() {
  console.log("Program:", program.programId.toBase58());
  console.log("Mint:", mint.toBase58());

  await inspect("RESERVE — 3,000,000 PAPA", reserve);
  await inspect("FOUNDER — 1,000,000 PAPA", founder);
}

main().catch((error) => {
  console.error("INSPECTION FAILED");
  console.error(error);
  process.exit(1);
});
