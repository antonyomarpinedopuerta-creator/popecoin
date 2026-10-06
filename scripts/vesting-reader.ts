import { Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { AccountLayout, MintLayout, unpackAccount, unpackMint } from "@solana/spl-token";
import { ReaderConfig, loadReaderConfig } from "../app/config";
import { DEVNET_MINT, DEVNET_PROGRAM_ID, DEVNET_RPC, devnetIdl } from "./devnet-config";

export const BENEFICIARIES = {
  reserve: "HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa",
  founder: "DuvtonEx95RYtTXiUUaUpz1t4PuRHRDGAVB6wD29EfT3",
} as const;

export function accrual(total: bigint, released: bigint, start: bigint, cliff: bigint, end: bigint, now: bigint) {
  if (total <= 0n || released < 0n || released > total || start >= end || cliff < start || cliff > end) {
    throw new Error("Invalid vesting state");
  }
  const accrued = now <= start ? 0n : now >= end ? total : total * (now - start) / (end - start);
  const vested = now < cliff ? 0n : accrued;
  return { accrued, vested, claimable: vested > released ? vested - released : 0n };
}

export function createDevnetConnection() {
  return new Connection(DEVNET_RPC, {
    commitment: "confirmed", disableRetryOnRateLimit: true,
    fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(12_000) }),
  });
}

export async function readVesting(beneficiary: PublicKey, connection = createDevnetConnection(), config:ReaderConfig = loadReaderConfig()) {
  if (connection.rpcEndpoint !== config.rpc && !(config.cluster === "devnet" && connection.rpcEndpoint === "http://127.0.0.1:8899")) throw new Error("Reader RPC endpoint mismatch");
  if (await connection.getGenesisHash() !== config.genesisHash) throw new Error("Reader genesis mismatch");
  const mintKey=new PublicKey(config.mint), programKey=new PublicKey(config.program);
  const idl: Idl = require("../target/idl/popecoin_vesting.json");
  const program = new Program({...idl,address:config.program}, { connection });
  const [vesting, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vesting"), beneficiary.toBuffer(), mintKey.toBuffer()], programKey,
  );
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), vesting.toBuffer()], programKey);
  // One context for all balances and the chain clock; never calculate from the PC clock.
  const { context, value } = await connection.getMultipleAccountsInfoAndContext(
    [vesting, vault, mintKey, SYSVAR_CLOCK_PUBKEY], "confirmed",
  );
  const [stateInfo, vaultInfo, mintInfo, clockInfo] = value;
  if (!stateInfo) throw new Error("Vesting not found on Devnet");
  if (stateInfo.executable || !stateInfo.owner.equals(programKey) || stateInfo.data.length !== 145) {
    throw new Error("Invalid vesting owner or size");
  }
  const state = program.coder.accounts.decode("vestingAccount", stateInfo.data);
  if (!state.beneficiary.equals(beneficiary) || !state.mint.equals(mintKey) || state.bump !== bump) {
    throw new Error("Vesting identity mismatch");
  }
  if (!vaultInfo || !mintInfo || vaultInfo.executable || mintInfo.executable ||
      vaultInfo.data.length !== AccountLayout.span || mintInfo.data.length !== MintLayout.span ||
      ![1, 2].includes(vaultInfo.data[108]) || mintInfo.data[45] !== 1 ||
      ![0, 1].includes(mintInfo.data.readUInt32LE(0)) ||
      ![0, 1].includes(mintInfo.data.readUInt32LE(46))) throw new Error("Invalid classic SPL account");
  const token = unpackAccount(vault, vaultInfo);
  const mint = unpackMint(mintKey, mintInfo);
  if (!token.owner.equals(vesting) || !token.mint.equals(mintKey) || !token.isInitialized ||
      !mint.isInitialized || mint.decimals !== config.decimals || token.isNative || token.delegate !== null ||
      token.closeAuthority !== null || token.delegatedAmount !== 0n) {
    throw new Error("Invalid vault or mint");
  }
  if (!clockInfo || clockInfo.executable || clockInfo.data.length !== 40 || !clockInfo.owner.equals(new PublicKey("Sysvar1111111111111111111111111111111111111"))) {
    throw new Error("Invalid chain clock");
  }
  const now = clockInfo.data.readBigInt64LE(32);
  const total = BigInt(state.totalAmount.toString()), released = BigInt(state.releasedAmount.toString());
  const start = BigInt(state.startTime.toString()), cliff = BigInt(state.cliffTime.toString()), end = BigInt(state.endTime.toString());
  const { accrued, vested, claimable } = accrual(total, released, start, cliff, end, now);
  if (await connection.getGenesisHash() !== config.genesisHash) throw new Error("Reader genesis changed during snapshot");
  return {
    cluster: config.cluster, symbol:config.symbol, decimals:config.decimals, slot: context.slot, observedAt: new Date().toISOString(),
    program: programKey.toBase58(), mint: mintKey.toBase58(), beneficiary: beneficiary.toBase58(),
    authority: state.authority.toBase58(), vesting: vesting.toBase58(), vault: vault.toBase58(),
    total: total.toString(), released: released.toString(), accrued: accrued.toString(), vested: vested.toString(), claimable: claimable.toString(),
    vaultBalance: token.amount.toString(), shortfall: (total - released > token.amount ? total - released - token.amount : 0n).toString(),
    start: start.toString(), cliff: cliff.toString(), end: end.toString(), chainTime: now.toString(),
    frozen: token.isFrozen, mintSupply: mint.supply.toString(), mintAuthorityActive: mint.mintAuthority !== null, freezeAuthorityActive: mint.freezeAuthority !== null,
    // Funding/clock checks alone cannot validate the destination, signature or deployed code.
    claimCoveredByVault: claimable > 0n && token.amount >= claimable && !token.isFrozen,
  };
}
