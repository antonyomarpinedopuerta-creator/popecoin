import test from "node:test";
import assert from "node:assert/strict";
import { BorshInstructionCoder, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { prepareRehearsal } from "../scripts/prepare-rehearsal";
import { DEVNET_MINT, DEVNET_PROGRAM_ID } from "../scripts/devnet-config";
import { ALLOCATIONS, PRODUCTION_PROGRAM } from "../scripts/production-plan";
const idl: Idl = require('../target/idl/popecoin_vesting.json');
// Public byte fixtures only: no generated identity, signer or approved deployment target.
const input = { cluster:'devnet', program:new PublicKey(Buffer.alloc(32,8)).toBase58(), mint:new PublicKey(Buffer.alloc(32,7)).toBase58(),
 payer:'HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa', authority:'HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa', beneficiary:'DuvtonEx95RYtTXiUUaUpz1t4PuRHRDGAVB6wD29EfT3', amount:'100',startUtc:'2027-01-01T00:00:00Z',cliffSeconds:60,durationSeconds:120 };
test('unsigned rehearsal instructions match Anchor account ordering and encoded ABI', async () => {
 const plan = prepareRehearsal(input,idl), coder = new BorshInstructionCoder(idl);
 const program = new Program({...idl,address:input.program},{connection:new Connection('http://127.0.0.1:1')});
 for (const step of plan.steps) {
  const decoded = coder.decode(Buffer.from(step.dataHex,'hex'))!;
  assert.equal(decoded.name,step.name);
  const definition = idl.instructions.find(ix=>ix.name===step.name)!;
  const accounts = Object.fromEntries(definition.accounts.map((account,i)=>[account.name.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),new PublicKey(step.accounts[i].address)]));
  const args = definition.args.map(arg=>(decoded.data as Record<string,unknown>)[arg.name]);
  const built = await program.methods[step.name](...args).accountsStrict(accounts).instruction();
  assert.equal(built.data.toString('hex'),step.dataHex);
  assert.deepEqual(built.keys.map(k=>({address:k.pubkey.toBase58(),signer:k.isSigner,writable:k.isWritable})),step.accounts);
 }
 const encoded=Buffer.from(plan.steps[0].dataHex,'hex');
 assert.equal(encoded.readBigUInt64LE(8),100n);
 assert.equal(encoded.readBigInt64LE(16),1798761600n);
 assert.equal(encoded.readBigInt64LE(24),1798761660n);
 assert.equal(encoded.readBigInt64LE(32),1798761720n);
 assert.notEqual(plan.source,plan.destination);
 assert.equal(BigInt(plan.end)-BigInt(plan.cliff),60n);
 assert.equal(plan.instructionsSha256,prepareRehearsal(input,idl).instructionsSha256);
});
test('unsigned rehearsal rejects protected identities, ambiguous amounts and malicious schedules', () => {
 for (const change of [{cluster:'mainnet-beta'},{program:PRODUCTION_PROGRAM.toBase58()},{mint:DEVNET_MINT.toBase58()},
  {payer:null},{authority:input.beneficiary},{amount:100},{amount:'1e2'},{amount:'0'},{amount:'100000001'},
  {startUtc:'2027-02-30T00:00:00Z'},{startUtc:'2027-01-01'},{cliffSeconds:0},{durationSeconds:60},{durationSeconds:3601}])
   assert.throws(()=>prepareRehearsal({...input,...change},idl));
 const [pda]=PublicKey.findProgramAddressSync([Buffer.from('not-a-signer')],DEVNET_PROGRAM_ID);
 assert.throws(()=>prepareRehearsal({...input,payer:pda.toBase58()},idl));
});
test('historical Devnet program is rejected even with a separate test mint', () => {
 assert.throws(()=>prepareRehearsal({...input,program:DEVNET_PROGRAM_ID.toBase58()},idl), /historical Devnet program/);
});
test('protected identities and account collisions fail in every rehearsal role', () => {
 for (const role of ['program','mint','payer','authority','beneficiary']) {
  for (const key of [PRODUCTION_PROGRAM.toBase58(), DEVNET_PROGRAM_ID.toBase58(), DEVNET_MINT.toBase58(), ...ALLOCATIONS.map(a=>a.beneficiary)])
   assert.throws(()=>prepareRehearsal({...input,[role]:key},idl));
 }
 for (const change of [{program:input.mint},{program:input.payer},{mint:input.beneficiary}])
  assert.throws(()=>prepareRehearsal({...input,...change},idl));
 assert.throws(()=>prepareRehearsal(input,idl,input.mint), /Protected identity/);
 assert.throws(()=>prepareRehearsal(input,idl,'invalid'));
 assert.throws(()=>prepareRehearsal(input,idl,''));
});
test('extended Devnet schedule requires explicit opt-in and preserves seven-day bound', () => {
 const extended={...input,durationPolicy:'extended-devnet-7-days',cliffSeconds:43200,durationSeconds:604800};
 const plan=prepareRehearsal(extended,idl);
 assert.equal(BigInt(plan.end)-BigInt(plan.start),604800n);
 assert.equal(BigInt(plan.cliff)-BigInt(plan.start),43200n);
 const decoded=new BorshInstructionCoder(idl).decode(Buffer.from(plan.steps[0].dataHex,'hex'))!;
 assert.equal((decoded.data as any).end_time.toString(),plan.end);
 for(const change of [{durationPolicy:undefined},{durationPolicy:'unbounded'},{durationSeconds:604801},{cliffSeconds:604800},{cluster:'mainnet-beta'}])
  assert.throws(()=>prepareRehearsal({...extended,...change},idl));
});
test('seven-day cycle reconciles pre-cliff, two partial claims and final dust', () => {
 const {vestedAmount}=require('../scripts/rehearsal-vesting-one-tx');
 const total=10000000n,start=2000000000n,cliff=start+43200n,end=start+604800n;
 assert.equal(vestedAmount(total,start,cliff,end,cliff-1n),0n);
 const first=vestedAmount(total,start,cliff,end,start+172800n);
 const second=vestedAmount(total,start,cliff,end,start+345600n);
 assert.equal(first,2857142n);assert.equal(second-first,2857143n);
 assert.equal(total-second,4285715n);
 assert.equal(vestedAmount(total,start,cliff,end,end),total);
 assert.equal(vestedAmount(total,start,cliff,end,end+86400n)-total,0n);
});
