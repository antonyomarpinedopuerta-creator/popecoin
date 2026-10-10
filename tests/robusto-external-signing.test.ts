import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PublicKey, Transaction, TransactionInstruction} from '@solana/web3.js';
import {HandoffReview, prepareExternalHandoff, rehearseExternalHandoff} from '../scripts/robusto-external-signing';

// Public-address bytes only; there is no keypair or private seed.
const payer = new PublicKey(Buffer.alloc(32, 2));
const authority = new PublicKey(Buffer.alloc(32, 3));
function fixture(data = 1, feePayer = payer, signer = authority) {
  const tx = new Transaction({feePayer, recentBlockhash: PublicKey.default.toBase58()}).add(
    new TransactionInstruction({programId: new PublicKey(Buffer.alloc(32, 4)),
      keys: [{pubkey: signer, isSigner: true, isWritable: false}], data: Buffer.from([data])}));
  const encoded = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  const review: HandoffReview = {scope: 'OFFLINE_FIXTURE_ONLY', payer: feePayer.toBase58(),
    messageSha256: createHash('sha256').update(tx.serializeMessage()).digest('hex'),
    requiredSigners: tx.compileMessage().accountKeys.slice(0, 2).map(k => k.toBase58())};
  return {tx, encoded, review};
}

test('external unsigned handoff roundtrip preserves exact message and exposes no signing capability', async () => {
  const {encoded, review} = fixture(); let calls = 0;
  const result = await rehearseExternalHandoff(encoded, review, {reviewUnsigned: async request => {
    calls++;
    assert(Object.isFrozen(request)); assert(Object.isFrozen(request.requiredSigners));
    assert.equal(request.mainnetMode, 'MAINNET_DISABLED');
    return request.unsignedTransactionBase64;
  }});
  assert.equal(calls, 1); assert.equal(result.signed, false); assert.equal(result.sent, false);
  assert.equal(result.productionSignerIntegrated, false);
});

test('handoff rejects changed instructions, payer, signer and blockhash before adapter invocation', async () => {
  const {encoded, review, tx} = fixture(); let calls = 0;
  tx.recentBlockhash = new PublicKey(Buffer.alloc(32, 9)).toBase58();
  const changedBlockhash = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  for (const changed of [fixture(2).encoded, fixture(1, authority).encoded,
    fixture(1, payer, new PublicKey(Buffer.alloc(32, 5))).encoded, changedBlockhash]) {
    await assert.rejects(rehearseExternalHandoff(changed, review, {reviewUnsigned: async () => {calls++; return encoded;}}));
  }
  assert.equal(calls, 0);
});

test('handoff rejects adapter tampering, signatures and malformed or oversized wire data', async () => {
  const {encoded, review, tx} = fixture();
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async () => fixture(2).encoded}));
  // Arbitrary public dummy bytes are deliberately NOT a cryptographic signature.
  tx.signatures[0].signature = Buffer.alloc(64, 1);
  const dummySigned = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  for (const bad of [dummySigned, encoded + '\n', '', 'A'.repeat(1648)]) assert.throws(() => prepareExternalHandoff(bad, review));
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async () => dummySigned}));
  assert.throws(() => prepareExternalHandoff(encoded, {...review, scope: 'MAINNET' as any}));
});

test('unsigned review rejects pre-cancellation and invalid timeouts before calling adapter', async () => {
  const {encoded, review} = fixture(); let calls = 0;
  const adapter = {reviewUnsigned: async () => {calls++; return encoded;}};
  const controller = new AbortController(); controller.abort();
  await assert.rejects(rehearseExternalHandoff(encoded, review, adapter, {signal: controller.signal}), /cancelled/);
  for (const timeoutMs of [0, -1, 1.5, NaN, Infinity, 60001])
    await assert.rejects(rehearseExternalHandoff(encoded, review, adapter, {timeoutMs}), /timeout/);
  assert.equal(calls, 0);
});

test('unsigned review cancellation rejects even when adapter ignores cancellation and returns bytes', async () => {
  const {encoded, review} = fixture(); const controller = new AbortController();
  let received: AbortSignal | undefined;
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async (_, signal) => {
    received = signal; controller.abort(); return encoded;
  }}, {signal: controller.signal}), /cancelled/);
  assert.equal(received?.aborted, true);
});

test('unsigned review timeout settles a stalled adapter and rejects a late response', async () => {
  const {encoded, review} = fixture(); let complete!: (value: string) => void;
  let received: AbortSignal | undefined;
  const pending = rehearseExternalHandoff(encoded, review, {reviewUnsigned: (_, signal) => {
    received = signal; return new Promise(resolve => {complete = resolve;});
  }}, {timeoutMs: 5});
  await assert.rejects(pending, /timed out/);
  assert.equal(received?.aborted, true); complete(encoded);
});

test('unsigned review propagates adapter failures without claiming success', async () => {
  const {encoded, review} = fixture();
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async () => {
    throw Error('fixture transport unavailable');
  }}), /transport unavailable/);
});

import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createCanonicalFixtureSession} from '../scripts/robusto-external-signing';
import {buildProductionSteps} from '../scripts/robusto-production';
function canonicalFixture() {
  let n = 20;
  const key = () => {
    for (;;) {
      const bytes = Buffer.alloc(32); bytes.writeUInt32LE(n++);
      if (PublicKey.isOnCurve(bytes)) return new PublicKey(bytes).toBase58();
    }
  };
  const p = {...JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')),
    payer:key(),mint:key(),program:key(),mintAuthority:key(),metadataUpdateAuthority:key(),upgradeAuthority:key(),
    imageSha256:'a'.repeat(64),metadataSha256:'b'.repeat(64),metadataUri:`ar://${'A'.repeat(43)}`,
    startUtc:'2027-01-01T00:00:00Z',
    allocations:[
      {label:'market_ecosystem_launch',beneficiary:key(),basisPoints:5000,baseUnits:'500000000000000'},
      {label:'community_marketing',beneficiary:key(),basisPoints:1500,baseUnits:'150000000000000'},
      {label:'reserve',beneficiary:key(),basisPoints:3000,baseUnits:'300000000000000',vesting:{start:'1814313600',cliff:'1814313600',end:'1908921600'}},
      {label:'team_founder',beneficiary:key(),basisPoints:500,baseUnits:'50000000000000',vesting:{start:'1830297600',cliff:'1830297600',end:'1893369600'}}]};
  p.distributionSourceOwner=p.allocations[0].beneficiary;
  const idl={...JSON.parse(fs.readFileSync('target/idl/popecoin_vesting.json','utf8')),address:p.program};
  const steps=buildProductionSteps(p,idl,1461600);
  const wire=(step:typeof steps[number])=>{
    const tx=new Transaction({feePayer:new PublicKey(p.payer),recentBlockhash:PublicKey.default.toBase58()}).add(...step.instructions);
    return {encoded:tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64'),
      review:{scope:'OFFLINE_FIXTURE_ONLY' as const,payer:p.payer,
        messageSha256:createHash('sha256').update(tx.serializeMessage()).digest('hex'),
        requiredSigners:tx.compileMessage().accountKeys.slice(0,tx.compileMessage().header.numRequiredSignatures).map(k=>k.toBase58())}};
  };
  return {p,idl,steps,wire};
}

test('all canonical token/distribution/vesting stages roundtrip offline with public fictitious identities',async()=>{
  const {p,idl,steps,wire}=canonicalFixture(),session=createCanonicalFixtureSession();
  for(const step of steps){
    const {encoded,review}=wire(step);
    const result=await session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async r=>r.unsignedTransactionBase64});
    assert.equal(result.canonicalStageVerified,true);assert.equal(result.label,step.label);
    assert.equal(result.signed,false);assert.equal(result.sent,false);
  }
});

test('canonical bridge rejects substituted stages and independently reviewed extra instructions',async()=>{
  const {p,idl,steps,wire}=canonicalFixture(),step=steps[2],{encoded,review}=wire(step);
  let calls=0;const adapter={reviewUnsigned:async()=>{calls++;return encoded;}};
  await assert.rejects(createCanonicalFixtureSession().review(p,idl,Buffer.alloc(0),steps[1],encoded,review,adapter),/canonical stage/);
  const changed={...step,instructions:[...step.instructions,new TransactionInstruction({programId:PublicKey.default,keys:[],data:Buffer.alloc(0)})]};
  const extra=wire(changed);
  await assert.rejects(createCanonicalFixtureSession().review(p,idl,Buffer.alloc(0),changed,extra.encoded,extra.review,adapter),/canonical/);
  await assert.rejects(createCanonicalFixtureSession().review(p,{...idl,address:review.payer},Buffer.alloc(0),step,encoded,review,adapter),/IDL/);
  assert.equal(calls,0);
});

test('canonical session consumes in-flight and failed requests and isolates caller mutation',async()=>{
  const {p,idl,steps,wire}=canonicalFixture(),step=steps[2],{encoded,review}=wire(step);
  const session=createCanonicalFixtureSession();let finish!:(s:string)=>void;
  const first=session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:()=>new Promise(r=>{finish=r;})});
  await assert.rejects(session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>encoded}),/Duplicate/);
  finish(encoded);assert.equal((await first).label,step.label);
  await assert.rejects(session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>encoded}),/Duplicate/);
  const failed=createCanonicalFixtureSession();
  await assert.rejects(failed.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>{throw Error('offline transport');}}),/transport/);
  await assert.rejects(failed.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>encoded}),/Duplicate/);
  const original=step.label;
  const result=await createCanonicalFixtureSession().review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>{
    step.label='tampered';review.messageSha256='0'.repeat(64);p.payer=authority.toBase58();return encoded;
  }});
  assert.equal(result.label,original);
});

test('elapsed timeout rejects an adapter that blocks timer delivery; synchronous throws propagate',async()=>{
  const {encoded,review}=fixture();let received:AbortSignal|undefined;
  await assert.rejects(rehearseExternalHandoff(encoded,review,{reviewUnsigned:async(_,signal)=>{
    received=signal;const start=performance.now();while(performance.now()-start<10){}return encoded;
  }},{timeoutMs:2}),/timed out/);
  assert.equal(received?.aborted,true);
  await assert.rejects(rehearseExternalHandoff(encoded,review,{reviewUnsigned:()=>{throw Error('sync failure');}}),/sync failure/);
});

test('canonical timeout and pending cancellation consume requests and discard late transport failures',async()=>{
  for(const mode of ['timeout','cancel']){
    const {p,idl,steps,wire}=canonicalFixture(),step=steps[2],{encoded,review}=wire(step);
    const session=createCanonicalFixtureSession(),controller=new AbortController();
    let rejectLate!:(e:Error)=>void;
    const pending=session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:()=>
      new Promise((_,reject)=>{rejectLate=reject;})},{timeoutMs:5,signal:controller.signal});
    const checked=assert.rejects(pending,mode==='timeout'?/timed out/:/cancelled/);
    await Promise.resolve();if(mode==='cancel')controller.abort();await checked;
    rejectLate(Error('late fixture failure'));await Promise.resolve();
    await assert.rejects(session.review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>encoded}),/Duplicate/);
  }
});

import os from 'node:os';
import path from 'node:path';
import {initializeFixtureJournal} from '../scripts/robusto-unsigned-journal';
test('canonical journal rejects duplicate after restart following success, cancellation or timeout',async()=>{
 for(const mode of ['success','cancel','timeout']){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'robusto-canonical-fixture-')),root=path.join(parent,'journal');
  try{
   initializeFixtureJournal(root);
   const {p,idl,steps,wire}=canonicalFixture(),step=steps[2],{encoded,review}=wire(step);
   const controller=new AbortController();let calls=0;
   const pending=createCanonicalFixtureSession(root).review(p,idl,Buffer.alloc(0),step,encoded,review,{reviewUnsigned:async()=>{
    calls++;if(mode==='success')return encoded;
    if(mode==='cancel')controller.abort();return new Promise<string>(()=>{});
   }},{signal:controller.signal,timeoutMs:10});
   if(mode==='success')assert.equal((await pending).canonicalStageVerified,true);
   else await assert.rejects(pending,mode==='cancel'?/cancelled/:/timed out/);
   await assert.rejects(createCanonicalFixtureSession(root).review(p,idl,Buffer.alloc(0),step,encoded,review,
    {reviewUnsigned:async()=>{calls++;return encoded;}}),/Duplicate or uncertain/);
   assert.equal(calls,1);
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
 }
});

import {createGuardedFixtureSession} from '../scripts/robusto-external-signing';
import {FixtureConditions,validateFixtureConditions} from '../scripts/robusto-fixture-conditions';
function guardedFixture(){
 const f=canonicalFixture(),step=f.steps[2],wire=f.wire(step);
 const tx=Transaction.from(Buffer.from(wire.encoded,'base64'));
 const accounts:FixtureConditions['expectedAccounts']={};
 for(const k of tx.compileMessage().accountKeys)accounts[k.toBase58()]={exists:true,owner:PublicKey.default.toBase58(),lamports:'10000',dataSha256:'a'.repeat(64),executable:false};
 const c:FixtureConditions={scope:'OFFLINE_FIXTURE_ONLY',authorization:false,cluster:'SIMULATED',
 snapshotSlot:100,snapshotAtMs:1000,nowMs:1100,currentSlot:101,maxAgeMs:100,maxSlotLag:1,
 currentHeight:10,blockhash:tx.recentBlockhash!,knownBlockhashes:[tx.recentBlockhash!],firstValidHeight:9,lastValidHeight:10,
 expectedAccounts:structuredClone(accounts),observedAccounts:structuredClone(accounts),
 budget:{fee:'5',rent:'10',otherDebit:'2',maxFee:'5',maxRent:'10',maxTotal:'17',payerReserve:'9983'}};
 return {...f,step,...wire,c};
}
test('guarded canonical preparation/review accepts exact simulated validity, budget and freshness limits',async()=>{
 const {p,idl,step,encoded,review,c}=guardedFixture();
 const ticket=createGuardedFixtureSession().prepare(p,idl,Buffer.alloc(0),step,encoded,review,c);
 const result=await ticket.review(()=>c,{reviewUnsigned:async r=>r.unsignedTransactionBase64});
 assert.equal(result.fixtureConditionsVerified,true);assert.equal(result.authorization,false);assert.equal(result.sent,false);
 assert.equal(result.scope,'OFFLINE_FIXTURE_ONLY');assert.equal(result.cluster,'SIMULATED');
 validateFixtureConditions(encoded,{...c,currentHeight:c.firstValidHeight});
});
test('fixture conditions reject missing data, unknown/expired hashes, stale/future snapshots and budget overflow',()=>{
 const {encoded,c}=guardedFixture();
 const patches:any[]=[{scope:'PRODUCTION'},{authorization:true},{cluster:'mainnet-beta'},
 {nowMs:1101},{nowMs:999},{currentSlot:102},{currentSlot:99},{currentHeight:11},{currentHeight:8},
 {knownBlockhashes:[]},{blockhash:authority.toBase58()},{lastValidHeight:8},{currentHeight:NaN},
 {observedAccounts:{}},{expectedAccounts:{}},{budget:null},
 ...['fee','rent','otherDebit','maxFee','maxRent','maxTotal','payerReserve'].map(k=>({budget:{...c.budget,[k]:undefined}})),
 {budget:{...c.budget,maxFee:'4'}},{budget:{...c.budget,maxRent:'9'}},{budget:{...c.budget,maxTotal:'16'}},
 {budget:{...c.budget,payerReserve:'9984'}},{budget:{...c.budget,fee:'05'}},{budget:{...c.budget,otherDebit:'18446744073709551616'}}];
 for(const patch of patches)assert.throws(()=>validateFixtureConditions(encoded,{...c,...patch}));
 for(const k of Object.keys(c)){
  const missing:any={...c};delete missing[k];assert.throws(()=>validateFixtureConditions(encoded,missing),k);
 }
});
test('fixture account state validates presence, owner, data hash, executable flag and balance for every key',()=>{
 const {encoded,c,p}=guardedFixture();
 for(const patch of [{owner:authority.toBase58()},{dataSha256:'b'.repeat(64)},{lamports:'9999'},{executable:true},
  {exists:false},{owner:null},{dataSha256:null}]){
  const changed=structuredClone(c);Object.assign(changed.observedAccounts[p.payer],patch);
  assert.throws(()=>validateFixtureConditions(encoded,changed));
 }
 const absent=structuredClone(c);absent.observedAccounts[p.payer]={exists:false,owner:null,lamports:'0',dataSha256:null,executable:false};
 absent.expectedAccounts=structuredClone(absent.observedAccounts);
 assert.throws(()=>validateFixtureConditions(encoded,absent),/payer/);
});
test('guarded review rejects changed data before adapter and rechecks after asynchronous review',async()=>{
 for(const mode of ['before','after','stale','config']){
  const {p,idl,step,encoded,review,c}=guardedFixture();let calls=0;
  const ticket=createGuardedFixtureSession().prepare(p,idl,Buffer.alloc(0),step,encoded,review,c);
  if(mode==='before')c.budget.maxTotal='18';if(mode==='config')p.startUtc='2028-01-01T00:00:00Z';
  await assert.rejects(ticket.review(()=>c,{reviewUnsigned:async()=>{
   calls++;if(mode==='after')c.budget.maxTotal='18';if(mode==='stale')c.currentHeight=11;return encoded;
  }}));
  assert.equal(calls,mode==='before'||mode==='config'?0:1);
 }
});

test('guarded review rejects simulated rollback and budget lower than encoded account-creation rent',async()=>{
 for(const patch of [{nowMs:1099},{currentSlot:100},{currentHeight:9}]){
  const {p,idl,step,encoded,review,c}=guardedFixture();
  const ticket=createGuardedFixtureSession().prepare(p,idl,Buffer.alloc(0),step,encoded,review,c);
  Object.assign(c,patch);
  await assert.rejects(ticket.review(()=>c,{reviewUnsigned:async()=>encoded}),/backwards/);
 }
 const {p,steps,wire,c}=guardedFixture();const {encoded}=wire(steps[0]);
 const tx=Transaction.from(Buffer.from(encoded,'base64'));const accounts:FixtureConditions['expectedAccounts']={};
 for(const k of tx.compileMessage().accountKeys)accounts[k.toBase58()]={exists:true,owner:PublicKey.default.toBase58(),lamports:'10000000',dataSha256:'a'.repeat(64),executable:false};
 c.expectedAccounts=structuredClone(accounts);c.observedAccounts=structuredClone(accounts);
 assert.throws(()=>validateFixtureConditions(encoded,c),/understates/);
 c.budget={fee:'5',rent:'1461600',otherDebit:'0',maxFee:'5',maxRent:'1461600',maxTotal:'1461605',payerReserve:'0'};
 validateFixtureConditions(encoded,c);
 assert.equal(c.observedAccounts[p.payer].lamports,'10000000');
});
