import assert from "node:assert/strict";
import test from "node:test";
import { BN, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { devnetIdl, DEVNET_PROGRAM_ID, DEVNET_MINT, loadDevnetKeypair, remainingDepositAmount } from "../scripts/devnet-config";

const idl: Idl = require("../target/idl/popecoin_vesting.json");
const beneficiary = new PublicKey("HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa");
// Instruction construction is entirely offline; no wallet and no RPC calls.
const program = new Program(devnetIdl(idl), { connection: new Connection("http://127.0.0.1:8899") });
const [vesting] = PublicKey.findProgramAddressSync(
  [Buffer.from("vesting"), beneficiary.toBuffer(), DEVNET_MINT.toBuffer()], DEVNET_PROGRAM_ID,
);
const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), vesting.toBuffer()], DEVNET_PROGRAM_ID);

test("Devnet binding preserves release IDL and derives checkpoint PDAs", () => {
  assert.equal(idl.address, "AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn");
  assert.equal(program.programId.toBase58(), DEVNET_PROGRAM_ID.toBase58());
  assert.equal(vesting.toBase58(), "A8CgDf97V7bdYNHUaiFSZ7w1ELa2ByUovkoKs6jihtUR");
  assert.equal(vault.toBase58(), "J75cXVBhuH2dekefy27ohEbgTt1bCbyDaSYo7fWVxVjZ");
});

test("generated IDL encodes initialize with beneficiary signature and exact u64", async () => {
  const ix = await program.methods.initialize(new BN("3000000000000"), new BN(100), new BN(200), new BN(300))
    .accountsStrict({ payer: beneficiary, authority: beneficiary, beneficiary, mint: DEVNET_MINT,
      vesting, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY })
    .instruction();
  assert.equal(ix.programId.toBase58(), DEVNET_PROGRAM_ID.toBase58());
  assert.equal(ix.keys[2].isSigner, true);
  assert.equal(ix.data.readBigUInt64LE(8), 3000000000000n);
  assert.equal(ix.data.readBigInt64LE(16), 100n);
});

test("generated IDL encodes deposit and release offline", async () => {
  const deposit = await program.methods.deposit(new BN("1000000000000"))
    .accountsStrict({ vesting, vault, authority: beneficiary, mint: DEVNET_MINT,
      authorityTokenAccount: beneficiary, tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  assert.equal(deposit.data.readBigUInt64LE(8), 1000000000000n);
  const release = await program.methods.release().accountsStrict({ vesting, vault, beneficiary,
    mint: DEVNET_MINT, beneficiaryTokenAccount: beneficiary, tokenProgram: TOKEN_PROGRAM_ID }).instruction();
  assert.equal(release.data.length, 8);
  assert.equal(release.keys[2].isSigner, true);
});

test("missing explicit Devnet signer fails before reading a default wallet", () => {
  const original = process.env.PAPA_DEVNET_PAYER_KEYPAIR;
  delete process.env.PAPA_DEVNET_PAYER_KEYPAIR;
  try { assert.throws(() => loadDevnetKeypair("PAYER"), /Set PAPA_DEVNET_PAYER_KEYPAIR/); }
  finally { if (original !== undefined) process.env.PAPA_DEVNET_PAYER_KEYPAIR = original; }
});

test("deposit top-up handles donations and large exact amounts", () => {
  assert.equal(remainingDepositAmount(3000000000000n, 1n), 2999999999999n);
  assert.equal(remainingDepositAmount(18446744073709551615n, 2n), 18446744073709551613n);
  assert.throws(() => remainingDepositAmount(100n, 100n), /fully funded/);
  assert.throws(() => remainingDepositAmount(100n, 101n), /overfunded/);
});
