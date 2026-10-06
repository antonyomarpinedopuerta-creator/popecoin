import test from "node:test";
import assert from "node:assert/strict";
import { BN, Program } from "@coral-xyz/anchor";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { accrual, BENEFICIARIES, readVesting } from "../scripts/vesting-reader";
import { DEVNET_PROGRAM_ID, DEVNET_MINT, devnetIdl } from "../scripts/devnet-config";

async function fixture() {
  const beneficiary = new PublicKey(BENEFICIARIES.reserve);
  const [vesting, bump] = PublicKey.findProgramAddressSync([Buffer.from("vesting"), beneficiary.toBuffer(), DEVNET_MINT.toBuffer()], DEVNET_PROGRAM_ID);
  const connection = new Connection("http://127.0.0.1:8899");
  const program = new Program(devnetIdl(require("../target/idl/popecoin_vesting.json")), { connection });
  const state = await program.coder.accounts.encode("vestingAccount", {
    authority: beneficiary, beneficiary, mint: DEVNET_MINT, totalAmount: new BN(100), releasedAmount: new BN(10),
    startTime: new BN(100), cliffTime: new BN(150), endTime: new BN(300), bump,
  });
  const vault = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({ mint: DEVNET_MINT, owner: vesting, amount: 90n, delegateOption: 0,
    delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
    closeAuthorityOption: 0, closeAuthority: PublicKey.default }, vault);
  const mint = Buffer.alloc(MintLayout.span);
  MintLayout.encode({ mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 100n,
    decimals: 6, isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default }, mint);
  const clock = Buffer.alloc(40); clock.writeBigInt64LE(200n, 32);
  const info = (data: Buffer, owner: PublicKey): AccountInfo<Buffer> => ({ data, owner, executable: false, lamports: 1000000, rentEpoch: 0 });
  const values = [info(state, DEVNET_PROGRAM_ID), info(vault, TOKEN_PROGRAM_ID), info(mint, TOKEN_PROGRAM_ID), info(clock, new PublicKey("Sysvar1111111111111111111111111111111111111"))];
  connection.getGenesisHash = async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
  connection.getMultipleAccountsInfoAndContext = async () => ({ context: { slot: 123 }, value: values });
  return { connection, beneficiary, values };
}

test("reader verifies accounts from one slot and chain time", async () => {
  const f = await fixture(); const result = await readVesting(f.beneficiary, f.connection);
  assert.equal(result.slot, 123); assert.equal(result.vested, "50"); assert.equal(result.claimable, "40");
  assert.equal(result.shortfall, "0"); assert.equal(result.claimCoveredByVault, true);
});
test("reader rejects owner, discriminator, size, token mint and clock tampering", async () => {
  for (const attack of ["owner", "discriminator", "size", "mint", "clock"]) {
    const f = await fixture();
    if (attack === "owner") f.values[0].owner = TOKEN_PROGRAM_ID;
    if (attack === "discriminator") f.values[0].data[0] ^= 255;
    if (attack === "size") f.values[0].data = Buffer.alloc(0);
    if (attack === "mint") f.values[1].data.fill(0, 0, 32);
    if (attack === "clock") f.values[3].data = Buffer.alloc(1);
    await assert.rejects(readVesting(f.beneficiary, f.connection), /./, attack);
  }
});
test("reader reports underfunding and freezing without claiming release is executable", async () => {
  const f = await fixture(); f.values[1].data.writeBigUInt64LE(1n, 64);
  let result = await readVesting(f.beneficiary, f.connection);
  assert.equal(result.shortfall, "89"); assert.equal(result.claimCoveredByVault, false);
  f.values[1].data.writeBigUInt64LE(90n, 64); f.values[1].data[108] = 2;
  result = await readVesting(f.beneficiary, f.connection);
  assert.equal(result.frozen, true); assert.equal(result.claimCoveredByVault, false);
});
test("client math covers cliff, end, rounding, backwards clock and u64 extremes", () => {
  assert.equal(accrual(100n, 0n, 0n, 50n, 100n, 49n).claimable, 0n);
  assert.equal(accrual(100n, 0n, 0n, 50n, 100n, 49n).accrued, 49n);
  assert.equal(accrual(100n, 0n, 0n, 50n, 100n, 50n).claimable, 50n);
  assert.equal(accrual(1n, 0n, 0n, 0n, 3n, 2n).claimable, 0n);
  assert.equal(accrual(100n, 50n, 0n, 0n, 100n, 40n).claimable, 0n);
  assert.equal(accrual(100n, 50n, 0n, 0n, 100n, 101n).claimable, 50n);
  assert.equal(accrual(2n**64n-1n, 0n, -(2n**63n), -(2n**63n), 2n**63n-1n, 0n).vested, 2n**63n);
  assert.throws(() => accrual(1n, 2n, 0n, 0n, 1n, 0n), /Invalid/);
});

test("reader rejects malformed classic SPL and unexpected vault powers", async () => {
  for (const attack of ["uninitialized mint", "uninitialized vault", "invalid state", "extended vault", "extended mint", "delegate", "close authority", "native", "executable", "bump"]) {
    const f = await fixture();
    if (attack === "uninitialized mint") f.values[2].data[45] = 0;
    if (attack === "uninitialized vault") f.values[1].data[108] = 0;
    if (attack === "invalid state") f.values[1].data[108] = 3;
    if (attack === "extended vault") f.values[1].data = Buffer.concat([f.values[1].data, Buffer.alloc(10)]);
    if (attack === "extended mint") f.values[2].data = Buffer.concat([f.values[2].data, Buffer.alloc(100)]);
    if (attack === "delegate") f.values[1].data.writeUInt32LE(1, 72);
    if (attack === "close authority") f.values[1].data.writeUInt32LE(1, 129);
    if (attack === "native") f.values[1].data.writeUInt32LE(1, 109);
    if (attack === "executable") f.values[0].executable = true;
    if (attack === "bump") f.values[0].data[144] ^= 1;
    await assert.rejects(readVesting(f.beneficiary, f.connection), /./, attack);
  }
});

test("reader rejects noncanonical mint flags from RPC", async () => {
  for (const offset of [0, 46]) {
    for (const invalid of [2, 255, 256, 0xffffffff]) {
      const f = await fixture();
      f.values[2].data.writeUInt32LE(invalid, offset);
      await assert.rejects(readVesting(f.beneficiary, f.connection), /Invalid classic SPL account/);
    }
  }
  for (const invalid of [2, 255]) {
    const f = await fixture(); f.values[2].data[45] = invalid;
    await assert.rejects(readVesting(f.beneficiary, f.connection), /Invalid classic SPL account/);
  }
  const f = await fixture();
  f.values[2].data.writeUInt32LE(1, 0);
  f.values[2].data.writeUInt32LE(1, 46);
  const result = await readVesting(f.beneficiary, f.connection);
  assert.equal(result.mintAuthorityActive, true);
  assert.equal(result.freezeAuthorityActive, true);
});
