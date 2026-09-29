import { Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const DEVNET_PROGRAM_ID = new PublicKey("BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc");
export const DEVNET_MINT = new PublicKey("ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw");

export function requireHistoricalDevnetOptIn() {
  if (process.env.PAPA_ALLOW_HISTORICAL_DEVNET !== DEVNET_PROGRAM_ID.toBase58()) {
    throw new Error("Historical Devnet signer tools require explicit PAPA_ALLOW_HISTORICAL_DEVNET program ID; never use for rehearsal");
  }
}

/** Fail before instruction execution if a legacy tool is retargeted or RPC is wrong. */
export async function assertHistoricalDevnet(connection: Pick<Connection, 'getGenesisHash'>,
  program: PublicKey, mint: PublicKey) {
  requireHistoricalDevnetOptIn();
  if (!program.equals(DEVNET_PROGRAM_ID) || !mint.equals(DEVNET_MINT)) {
    throw new Error("Historical Devnet program/mint mismatch");
  }
  if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') {
    throw new Error("Historical tool requires verified Devnet genesis");
  }
}

// The release build's IDL contains the production address. The deployed Devnet
// program has the same instruction ABI but a different identity and PDA namespace.
export function devnetIdl(idl: Idl): Idl {
  return { ...idl, address: DEVNET_PROGRAM_ID.toBase58() };
}

// Never silently use the Solana CLI default wallet, which may be a production key.
// These scripts are operator tools; tests never invoke this loader.
export function loadDevnetKeypair(role: "PAYER" | "DEVELOPMENT" | "FOUNDER" | "RESERVE"): Keypair {
  requireHistoricalDevnetOptIn();
  const variable = `PAPA_DEVNET_${role}_KEYPAIR`;
  const filename = process.env[variable];
  if (!filename) throw new Error(`Set ${variable} to an external Devnet-only keypair file`);
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(filename, "utf8"))));
  } catch {
    throw new Error(`Cannot load the Devnet keypair specified by ${variable}`);
  }
}

/** Exact top-up required by deposit; use bigint throughout, never JS numbers. */
export function remainingDepositAmount(total: bigint, balance: bigint): bigint {
  if (total <= 0n || balance < 0n || balance >= total) {
    throw new Error("Vault already fully funded, overfunded, or invalid amount");
  }
  return total - balance;
}
