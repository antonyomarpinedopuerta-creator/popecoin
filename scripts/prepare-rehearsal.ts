/** Offline instruction review only: no connection, transaction, wallet or signing API. */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { BN, BorshInstructionCoder, Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DEVNET_MINT, DEVNET_PROGRAM_ID } from "./devnet-config";
import { ALLOCATIONS, PRODUCTION_PROGRAM } from "./production-plan";

export type RehearsalInput = { cluster: unknown; program: unknown; mint: unknown; payer: unknown;
  authority: unknown; beneficiary: unknown; amount: unknown; startUtc: unknown; cliffSeconds: unknown; durationSeconds: unknown };
function address(value: unknown, signer = false) {
  if (typeof value !== "string") throw new Error("Public rehearsal addresses are pending");
  const key = new PublicKey(value);
  if (key.equals(PublicKey.default) || (signer && !PublicKey.isOnCurve(key.toBytes()))) throw new Error("Invalid public account or signer");
  return key;
}
export function prepareRehearsal(input: RehearsalInput, idl: Idl, protectedMint?: string) {
  if (input.cluster !== "devnet") throw new Error("Only an explicit Devnet rehearsal is supported");
  const program = address(input.program), mint = address(input.mint);
  if (program.equals(PRODUCTION_PROGRAM) || program.equals(DEVNET_PROGRAM_ID) || mint.equals(DEVNET_MINT)) throw new Error("Use an isolated Devnet program/mint; production identity, historical Devnet program and historical PAPA mint are prohibited");
  const payer = address(input.payer, true), authority = address(input.authority, true), beneficiary = address(input.beneficiary, true);
  const protectedAddresses = [PRODUCTION_PROGRAM, DEVNET_PROGRAM_ID, DEVNET_MINT,
    ...ALLOCATIONS.map(a => new PublicKey(a.beneficiary)), ...(protectedMint !== undefined ? [address(protectedMint)] : [])];
  if ([program, mint, payer, authority, beneficiary].some(key => protectedAddresses.some(p => p.equals(key))))
    throw new Error("Protected identity cannot occupy any rehearsal role");
  if (program.equals(mint) || [payer, authority, beneficiary].some(key => key.equals(program) || key.equals(mint)))
    throw new Error("Program and mint must be separate from each other and all signers");
  if (authority.equals(beneficiary)) throw new Error("Use distinct authority and beneficiary to exercise authorization");
  if (typeof input.amount !== "string" || !/^[1-9][0-9]*$/.test(input.amount) || input.amount.length > 9 || BigInt(input.amount) > 100000000n) throw new Error("Use 1..100000000 test-token base units as an exact decimal string");
  if (typeof input.startUtc !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(input.startUtc)) throw new Error("An explicit approved UTC start is required");
  const milliseconds = Date.parse(input.startUtc);
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || new Date(milliseconds).toISOString().replace('.000Z','Z') !== input.startUtc) throw new Error("Invalid startUtc");
  if (typeof input.cliffSeconds !== "number" || !Number.isInteger(input.cliffSeconds) || input.cliffSeconds < 10 ||
      typeof input.durationSeconds !== "number" || !Number.isInteger(input.durationSeconds) || input.durationSeconds <= input.cliffSeconds || input.durationSeconds > 3600) throw new Error("Use 10 <= cliff < duration <= 3600 seconds");
  const start = BigInt(milliseconds / 1000), cliff = start + BigInt(input.cliffSeconds), end = start + BigInt(input.durationSeconds);
  const [vesting] = PublicKey.findProgramAddressSync([Buffer.from('vesting'), beneficiary.toBuffer(), mint.toBuffer()], program);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), vesting.toBuffer()], program);
  const source = getAssociatedTokenAddressSync(mint, authority), destination = getAssociatedTokenAddressSync(mint, beneficiary);
  const coder = new BorshInstructionCoder(idl);
  const meta = (pubkey: PublicKey, isSigner: boolean, isWritable: boolean) => ({ pubkey, isSigner, isWritable });
  const instructions = [
    new TransactionInstruction({ programId: program, keys: [meta(payer,true,true),meta(authority,true,false),meta(beneficiary,true,false),meta(mint,false,false),meta(vesting,false,true),meta(vault,false,true),meta(TOKEN_PROGRAM_ID,false,false),meta(SystemProgram.programId,false,false),meta(SYSVAR_RENT_PUBKEY,false,false)],
      data: coder.encode('initialize', { total_amount: new BN(input.amount), start_time: new BN(start.toString()), cliff_time: new BN(cliff.toString()), end_time: new BN(end.toString()) }) }),
    new TransactionInstruction({ programId: program, keys: [meta(vesting,false,true),meta(vault,false,true),meta(authority,true,true),meta(mint,false,false),meta(source,false,true),meta(TOKEN_PROGRAM_ID,false,false)], data: coder.encode('deposit', { amount: new BN(input.amount) }) }),
    new TransactionInstruction({ programId: program, keys: [meta(vesting,false,true),meta(vault,false,true),meta(beneficiary,true,true),meta(mint,false,false),meta(destination,false,true),meta(TOKEN_PROGRAM_ID,false,false)], data: coder.encode('release', {}) }),
  ];
  const steps = instructions.map((ix, i) => ({ name: ['initialize','deposit','release'][i], program: ix.programId.toBase58(),
    accounts: ix.keys.map(k => ({ address: k.pubkey.toBase58(), signer: k.isSigner, writable: k.isWritable })), dataHex: ix.data.toString('hex') }));
  return { status: 'UNSIGNED INSTRUCTIONS FOR REVIEW — NOT AUTHORIZED OR SIMULATED', cluster: 'devnet', payer: payer.toBase58(),
    program: program.toBase58(), mint: mint.toBase58(), authority: authority.toBase58(), beneficiary: beneficiary.toBase58(), amount: input.amount, start: start.toString(), cliff: cliff.toString(), end: end.toString(),
    vesting: vesting.toBase58(), vault: vault.toBase58(), source: source.toBase58(), destination: destination.toBase58(),
    steps, instructionsSha256: createHash('sha256').update(JSON.stringify(steps)).digest('hex'),
    prerequisites: ['Verify Devnet genesis and candidate ProgramData/binary match', 'Use a dedicated classic SPL test mint with 6 decimals and no freeze authority',
      'Confirm vesting/vault do not exist and source/destination ATAs have correct owners and mint', 'Source must hold the full amount; initialize creates an empty vault',
      'Check current chain clock and fees/rent; obtain approval before wallet simulation, show its result and obtain separate approval before signing/sending',
      'Release before cliff must fail; reconcile partial, repeated and final claims by chain time', 'These instructions contain no blockhash or signatures and must not be replayed blindly'] };
}
if (require.main === module) {
  try {
    const input = JSON.parse(fs.readFileSync('config/rehearsal-plan.json','utf8'));
    const idl = JSON.parse(fs.readFileSync('target/idl/popecoin_vesting.json','utf8'));
    const production = JSON.parse(fs.readFileSync('config/production-plan.json','utf8'));
    if (production.mint !== null && typeof production.mint !== 'string') throw new Error('Invalid protected production mint');
    console.log(JSON.stringify(prepareRehearsal(input, idl, production.mint ?? undefined), null, 2));
  } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
