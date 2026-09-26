import { Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { unpackAccount, unpackMint } from "@solana/spl-token";
import { DEVNET_MINT, DEVNET_PROGRAM_ID, DEVNET_RPC, devnetIdl } from "./devnet-config";

export const BENEFICIARIES = {
  reserve: "HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa",
  founder: "DuvtonEx95RYtTXiUUaUpz1t4PuRHRDGAVB6wD29EfT3",
} as const;

export function accrual(total: bigint, released: bigint, start: bigint, cliff: bigint, end: bigint, now: bigint) {
  if (total <= 0n || released < 0n || released > total || start >= end || cliff < start || cliff > end) {
    throw new Error("Invalid vesting state");
  }
  const vested = now < cliff ? 0n : now >= end ? total : total * (now - start) / (end - start);
  return { vested, claimable: vested > released ? vested - released : 0n };
}

export function createDevnetConnection() {
  return new Connection(DEVNET_RPC, {
    commitment: "confirmed", disableRetryOnRateLimit: true,
    fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(12_000) }),
  });
}

export async function readVesting(beneficiary: PublicKey, connection = createDevnetConnection()) {
  const idl: Idl = require("../target/idl/popecoin_vesting.json");
  const program = new Program(devnetIdl(idl), { connection });
  const [vesting, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vesting"), beneficiary.toBuffer(), DEVNET_MINT.toBuffer()], DEVNET_PROGRAM_ID,
  );
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), vesting.toBuffer()], DEVNET_PROGRAM_ID);
  // One context for all balances and the chain clock; never calculate from the PC clock.
  const { context, value } = await connection.getMultipleAccountsInfoAndContext(
    [vesting, vault, DEVNET_MINT, SYSVAR_CLOCK_PUBKEY], "confirmed",
  );
  const [stateInfo, vaultInfo, mintInfo, clockInfo] = value;
  if (!stateInfo) throw new Error("Vesting not found on Devnet");
  if (!stateInfo.owner.equals(DEVNET_PROGRAM_ID) || stateInfo.data.length !== 145) {
    throw new Error("Invalid vesting owner or size");
  }
  const state = program.coder.accounts.decode("vestingAccount", stateInfo.data);
  if (!state.beneficiary.equals(beneficiary) || !state.mint.equals(DEVNET_MINT) || state.bump !== bump) {
    throw new Error("Vesting identity mismatch");
  }
  const token = unpackAccount(vault, vaultInfo);
  const mint = unpackMint(DEVNET_MINT, mintInfo);
  if (!token.owner.equals(vesting) || !token.mint.equals(DEVNET_MINT) || !token.isInitialized || mint.decimals !== 6) {
    throw new Error("Invalid vault or mint");
  }
  if (!clockInfo || clockInfo.data.length !== 40 || !clockInfo.owner.equals(new PublicKey("Sysvar1111111111111111111111111111111111111"))) {
    throw new Error("Invalid chain clock");
  }
  const now = clockInfo.data.readBigInt64LE(32);
  const total = BigInt(state.totalAmount.toString()), released = BigInt(state.releasedAmount.toString());
  const start = BigInt(state.startTime.toString()), cliff = BigInt(state.cliffTime.toString()), end = BigInt(state.endTime.toString());
  const { vested, claimable } = accrual(total, released, start, cliff, end, now);
  return {
    cluster: "devnet", slot: context.slot, observedAt: new Date().toISOString(),
    program: DEVNET_PROGRAM_ID.toBase58(), mint: DEVNET_MINT.toBase58(), beneficiary: beneficiary.toBase58(),
    authority: state.authority.toBase58(), vesting: vesting.toBase58(), vault: vault.toBase58(),
    total: total.toString(), released: released.toString(), vested: vested.toString(), claimable: claimable.toString(),
    vaultBalance: token.amount.toString(), shortfall: (total - released > token.amount ? total - released - token.amount : 0n).toString(),
    start: start.toString(), cliff: cliff.toString(), end: end.toString(), chainTime: now.toString(),
    frozen: token.isFrozen, mintAuthorityActive: mint.mintAuthority !== null, freezeAuthorityActive: mint.freezeAuthority !== null,
    executableClaim: claimable > 0n && token.amount >= claimable && !token.isFrozen,
  };
}
