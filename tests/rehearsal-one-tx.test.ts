import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicKey,Transaction} from '@solana/web3.js';
import {ALLOCATIONS} from '../scripts/production-plan';
import {readDeployment,assertSafeRoles,deriveBuffer,loaderData,writeData,deployData,prepareOne,verifiedPrefix,verifyProgram,GENESIS,RPC,LOADER} from '../scripts/rehearsal-one-tx';
const plan=readDeployment();
function mock(genesis=GENESIS,accounts=new Map<string,any>()) {
 const calls:string[]=[];
 const c:any={_rpcEndpoint:RPC,
  getGenesisHash:async()=>{calls.push('genesis');return genesis;},
  getMinimumBalanceForRentExemption:async(size:number)=>{calls.push('rent');return size*1000;},
  getAccountInfo:async(key:PublicKey)=>{calls.push('account:'+key.toBase58());return accounts.get(key.toBase58())??null;},
  getLatestBlockhash:async()=>{calls.push('blockhash');return {blockhash:'11111111111111111111111111111111',lastValidBlockHeight:99};},
  getFeeForMessage:async()=>{calls.push('fee');return {context:{slot:77},value:5000};},
  getBalance:async()=>{calls.push('balance');return 0;},
  getSlot:async()=>{calls.push('slot');return 77;}};
 return {connection:c,calls};
}
function bufferAccount(data:Buffer){return {data,owner:LOADER,lamports:1,executable:false,rentEpoch:0};}
function bufferData(elf:Buffer,authority:PublicKey,max=plan.maxProgramBytes){
 const data=Buffer.alloc(37+max);data.writeUInt32LE(1);data[4]=1;authority.toBuffer().copy(data,5);elf.copy(data,37);return data;
}
test('pins deployment, candidate and all protected roles without consulting CLI config',()=>{
 assert.equal(plan.rpc,RPC);assert.equal(plan.genesisHash,GENESIS);
 assertSafeRoles(plan);
 for(const field of ['program','payer','upgradeAuthority'] as const){
  for(const address of ['AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn','BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc','ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw',...ALLOCATIONS.map(a=>a.beneficiary)])
   assert.throws(()=>assertSafeRoles({...plan,[field]:address}));
 }
 assert.throws(()=>assertSafeRoles({...plan,rpc:'https://api.mainnet-beta.solana.com'}));
 assert.throws(()=>assertSafeRoles({...plan,genesisHash:'mainnet'}));
 assert.throws(()=>assertSafeRoles({...plan,payer:plan.program}));
});
test('serializes loader instructions with bounded fragments',()=>{
 assert.equal(loaderData(0).readUInt32LE(0),0);
 const bytes=writeData(650,Buffer.from([1,2,3]));assert.equal(bytes.readUInt32LE(0),1);
 assert.equal(bytes.readUInt32LE(4),650);assert.equal(bytes.readBigUInt64LE(8),3n);
 assert.deepEqual(bytes.subarray(16),Buffer.from([1,2,3]));
 assert.equal(deployData(232640).readUInt32LE(0),2);assert.equal(deployData(232640).readBigUInt64LE(4),232640n);
 for(const [offset,data] of [[-1,Buffer.from([1])],[0,Buffer.alloc(0)],[0,Buffer.alloc(651)] ] as [number,Buffer][] )assert.throws(()=>writeData(offset,data));
 assert.throws(()=>deployData(0));
});
test('derived buffer is deterministic, bounded and separated from known roles',async()=>{
 const one=await deriveBuffer(new PublicKey(plan.payer),'papa-buffer-19d8bf9');
 assert(one.equals(await deriveBuffer(new PublicKey(plan.payer),'papa-buffer-19d8bf9')));
 assert(!one.equals(new PublicKey(plan.program)));assert(!one.equals(new PublicKey(plan.upgradeAuthority)));
 for(const seed of ['', 'x'.repeat(33), 'line\nbreak','é'])await assert.rejects(deriveBuffer(new PublicKey(plan.payer),seed));
 const {connection}=mock();await assert.rejects(prepareOne(connection,'buffer-create',{bufferSeed:'different-seed'},plan),/pinned public seed/);
});
test('buffer creation yields one unsigned atomic transaction, no hidden follow-up',async()=>{
 const {connection,calls}=mock();
 const result:any=await prepareOne(connection,'buffer-create',{bufferSeed:'papa-buffer-19d8bf9'},plan);
 assert.match(result.status,/UNSIGNED SINGLE TRANSACTION/);assert.equal(result.operation,'create and initialize buffer');
 assert.equal(result.requiredSigners.length,1);assert.equal(result.requiredSigners[0],plan.payer);
 assert.equal(result.rentLamports,(37+plan.maxProgramBytes)*1000);assert.equal(result.maxImmediateLamports,(37+plan.maxProgramBytes)*1000+5000);assert(result.transactionBytes<=1232);
 assert.equal(result.payerBalanceLamports,0);assert.equal(result.adequatelyFunded,false);
 const tx=Transaction.from(Buffer.from(result.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,2);assert.deepEqual(calls.filter(x=>x==='genesis').length,2);
 assert(!calls.some(x=>x==='sendTransaction'||x==='simulateTransaction'));
});
test('wrong genesis and an unexpected endpoint fail before account/build RPC work',async()=>{
 let m=mock('wrong');await assert.rejects(prepareOne(m.connection,'buffer-create',{bufferSeed:'abc'},plan),/genesis/);
 assert.deepEqual(m.calls,['genesis']);
 m=mock();m.connection._rpcEndpoint='https://api.mainnet-beta.solana.com';
 await assert.rejects(prepareOne(m.connection,'buffer-create',{bufferSeed:'abc'},plan),/endpoint/);
 assert.deepEqual(m.calls,[]);
});
test('insufficient rent, unavailable fee and stale artifact pins fail closed',async()=>{
 const seed=plan.bufferSeed!;
 const m=mock();m.connection.getMinimumBalanceForRentExemption=async()=>0;
 await assert.rejects(prepareOne(m.connection,'buffer-create',{bufferSeed:seed},plan),/rent unavailable/);
 const n=mock();n.connection.getFeeForMessage=async()=>({context:{slot:77},value:null});
 await assert.rejects(prepareOne(n.connection,'buffer-create',{bufferSeed:seed},plan),/fee unavailable/);
 const o=mock();await assert.rejects(prepareOne(o.connection,'buffer-create',{bufferSeed:seed},{...plan,elfSha256:'0'.repeat(64)}),/candidate matching/);
});
test('one ELF fragment only, in-order, exact bytes and expected signers',async()=>{
 const {findCandidate}=require('../scripts/rehearsal-one-tx') as typeof import('../scripts/rehearsal-one-tx');
 const {elf}=findCandidate(plan),authority=new PublicKey(plan.upgradeAuthority),buffer=await deriveBuffer(new PublicKey(plan.payer),'papa-buffer-19d8bf9');
 const accounts=new Map([[buffer.toBase58(),bufferAccount(bufferData(Buffer.alloc(0),authority))]]);
 const {connection}=mock(GENESIS,accounts);
 const result:any=await prepareOne(connection,'buffer-write',{bufferSeed:'papa-buffer-19d8bf9',offset:'0',length:'650'},plan);
 assert.equal(result.operation,'write one ELF fragment');assert.equal(result.offset,0);assert.equal(result.length,650);
 assert.deepEqual(new Set(result.requiredSigners),new Set([plan.payer,plan.upgradeAuthority]));
 const tx=Transaction.from(Buffer.from(result.unsignedTransactionBase64,'base64'));assert.equal(tx.instructions.length,1);
 assert.equal(tx.instructions[0].programId.toBase58(),LOADER.toBase58());assert.equal(tx.instructions[0].data.readUInt32LE(0),1);
 assert.deepEqual(tx.instructions[0].data.subarray(16),elf.subarray(0,650));assert(result.transactionBytes<=1232);
 await assert.rejects(prepareOne(connection,'buffer-write',{bufferSeed:'papa-buffer-19d8bf9',offset:'400',length:'400'},plan),/offset 0/);
});
test('read-only buffer verification requires complete ELF and zero padding',async()=>{
 const {findCandidate}=require('../scripts/rehearsal-one-tx') as typeof import('../scripts/rehearsal-one-tx');
 const roomy={...plan,maxProgramBytes:plan.maxProgramBytes+32};
 const {elf}=findCandidate(roomy),authority=new PublicKey(plan.upgradeAuthority),buffer=await deriveBuffer(new PublicKey(plan.payer),'papa-buffer-19d8bf9');
 const {connection}=mock(GENESIS,new Map([[buffer.toBase58(),bufferAccount(bufferData(elf,authority,roomy.maxProgramBytes))]]));
 const result:any=await prepareOne(connection,'buffer-verify',{bufferSeed:'papa-buffer-19d8bf9'},roomy);
 assert.equal(result.status,'READ ONLY BUFFER VERIFIED');assert.equal(result.elfSha256,plan.elfSha256);
 const data=bufferData(elf,authority,roomy.maxProgramBytes);data[37+elf.length]=1;
 const bad=mock(GENESIS,new Map([[buffer.toBase58(),bufferAccount(data)]]));
 await assert.rejects(prepareOne(bad.connection,'buffer-verify',{bufferSeed:'papa-buffer-19d8bf9'},roomy),/nonzero buffer data/);
});
test('DeployWithMaxDataLen is a single unsigned message requiring payer, program and authority',async()=>{
 const {findCandidate}=require('../scripts/rehearsal-one-tx') as typeof import('../scripts/rehearsal-one-tx');
 const roomy={...plan,maxProgramBytes:plan.maxProgramBytes+32};
 const {elf}=findCandidate(roomy),authority=new PublicKey(plan.upgradeAuthority),buffer=await deriveBuffer(new PublicKey(plan.payer),'papa-buffer-19d8bf9');
 const {connection}=mock(GENESIS,new Map([[buffer.toBase58(),bufferAccount(bufferData(elf,authority,roomy.maxProgramBytes))]]));
 const result:any=await prepareOne(connection,'program-deploy',{bufferSeed:'papa-buffer-19d8bf9'},roomy);
 assert.equal(result.operation,'create executable and deploy from verified buffer');
 assert.deepEqual(new Set(result.requiredSigners),new Set([plan.payer,plan.program,plan.upgradeAuthority]));
 assert.equal(result.programRentLamports,36000);assert.equal(result.programDataRentLamports,(45+roomy.maxProgramBytes)*1000);
 assert.equal(result.maxImmediateLamports,(36+45+roomy.maxProgramBytes)*1000+5000);
 const tx=Transaction.from(Buffer.from(result.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,2);assert.equal(tx.instructions[1].programId.toBase58(),LOADER.toBase58());
 assert.equal(tx.instructions[1].data.readUInt32LE(0),2);assert.equal(tx.instructions[1].data.readBigUInt64LE(4),BigInt(roomy.maxProgramBytes));
});
test('read-only Program and ProgramData verifier matches bytes and authority',async()=>{
 const {findCandidate}=require('../scripts/rehearsal-one-tx') as typeof import('../scripts/rehearsal-one-tx');
 const roomy={...plan,maxProgramBytes:plan.maxProgramBytes+32};
 const {elf}=findCandidate(roomy),program=new PublicKey(plan.program),[pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
 const programData=Buffer.alloc(36);programData.writeUInt32LE(2);pd.toBuffer().copy(programData,4);
 const pdData=Buffer.alloc(45+roomy.maxProgramBytes);pdData.writeUInt32LE(3);pdData.writeBigUInt64LE(123n,4);pdData[12]=1;new PublicKey(plan.upgradeAuthority).toBuffer().copy(pdData,13);elf.copy(pdData,45);
 const accounts=new Map([[program.toBase58(),{...bufferAccount(programData),executable:true}],[pd.toBase58(),bufferAccount(pdData)]]);
 const {connection}=mock(GENESIS,accounts);const result:any=await verifyProgram(connection,roomy);
 assert.equal(result.status,'READ ONLY PROGRAM VERIFIED');assert.equal(result.elfSha256,plan.elfSha256);assert.equal(result.deploymentSlot,'123');
 pdData[45+elf.length]=4;const bad=mock(GENESIS,accounts);await assert.rejects(verifyProgram(bad.connection,roomy),/padding/);
});
test('buffer state verifier rejects wrong owner, authority, tag, size and ELF prefix',()=>{
 const {findCandidate}=require('../scripts/rehearsal-one-tx') as typeof import('../scripts/rehearsal-one-tx');
 const {elf}=findCandidate(plan),authority=new PublicKey(plan.upgradeAuthority),valid=bufferData(elf,authority);
 assert.equal(verifiedPrefix(valid,elf,authority,plan.maxProgramBytes),elf.length);
 for(const data of [Buffer.alloc(5),Buffer.from(valid)]){
  if(data.length>100)data[4]=0;
  assert.throws(()=>verifiedPrefix(data,elf,authority,plan.maxProgramBytes));
 }
 const changed=Buffer.from(valid);changed[37+100]^=1;assert.throws(()=>verifiedPrefix(changed,elf,authority,plan.maxProgramBytes),/Unexpected nonzero data/);
});
