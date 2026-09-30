import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {Connection,PublicKey,Transaction} from '@solana/web3.js';
import {getAssociatedTokenAddressSync,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {readDeployment,GENESIS,RPC,LOADER,Deployment} from '../scripts/rehearsal-one-tx';
import {prepareVestingOne,readVestingSnapshot,reconcileFinalSnapshot,vestedAmount,PRECLIFF_SAFETY_MARGIN_SECONDS} from '../scripts/rehearsal-vesting-one-tx';
import {RehearsalInput} from '../scripts/prepare-rehearsal';
import {Idl} from '@coral-xyz/anchor';

const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function fixture(seed:number,used:string[]=[]){for(let i=seed;i<256;i++){const k=new PublicKey(Buffer.alloc(32,i));if(PublicKey.isOnCurve(k.toBytes())&&!used.includes(k.toBase58())){used.push(k.toBase58());return k;}}throw Error('fixture');}
const used:string[]=[];const original=readDeployment(),authority=fixture(40,used),beneficiary=fixture(80,used),mint=fixture(120,used);
const total='1000000',startUtc='2027-01-01T00:00:00Z',start=BigInt(Date.parse(startUtc)/1000),cliff=start+60n,end=start+3600n;
const input:RehearsalInput={cluster:'devnet',program:original.program,mint:mint.toBase58(),payer:original.payer,authority:authority.toBase58(),beneficiary:beneficiary.toBase58(),amount:total,startUtc,cliffSeconds:60,durationSeconds:3600};
const idl={address:original.program,instructions:[
 {name:'initialize',discriminator:[175,175,109,31,13,152,155,237],accounts:[],args:[{name:'total_amount',type:'u64'},{name:'start_time',type:'i64'},{name:'cliff_time',type:'i64'},{name:'end_time',type:'i64'}]},
 {name:'deposit',discriminator:[242,35,198,137,82,225,242,182],accounts:[],args:[{name:'amount',type:'u64'}]},
 {name:'release',discriminator:[253,249,15,206,28,127,193,241],accounts:[],args:[]},
 ],accounts:[{name:'VestingAccount',discriminator:[102,73,10,233,200,188,228,216]}]} as unknown as Idl;
const candidateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'papa-vesting-candidate-')),candidateDir=path.join(candidateRoot,`${original.program}-fixture`);fs.mkdirSync(candidateDir);
const elf=Buffer.alloc(1024,0x66);Buffer.from([0x7f,0x45,0x4c,0x46]).copy(elf);const idlBytes=Buffer.from(JSON.stringify(idl));
const manifestBytes=Buffer.from(JSON.stringify({programId:original.program,status:'built-not-runtime-verified'}));
fs.writeFileSync(path.join(candidateDir,'program.so'),elf);fs.writeFileSync(path.join(candidateDir,'idl.json'),idlBytes);fs.writeFileSync(path.join(candidateDir,'manifest.json'),manifestBytes);
const deployment:Deployment={...original,maxProgramBytes:2048,elfSha256:hash(elf),idlSha256:hash(idlBytes),manifestSha256:hash(manifestBytes)};
test.after(()=>fs.rmSync(candidateRoot,{recursive:true,force:true}));

function mintData(supply=BigInt(total)){const b=Buffer.alloc(82);b.writeUInt32LE(1,0);new PublicKey(input.authority as string).toBuffer().copy(b,4);b.writeBigUInt64LE(supply,36);b[44]=6;b[45]=1;return b;}
function tokenData(owner:PublicKey,amount:bigint){const b=Buffer.alloc(165);mint.toBuffer().copy(b);owner.toBuffer().copy(b,32);b.writeBigUInt64LE(amount,64);b[108]=1;return b;}
function vestingData(released:bigint){const b=Buffer.alloc(145);b.set([102,73,10,233,200,188,228,216]);new PublicKey(input.authority as string).toBuffer().copy(b,8);new PublicKey(input.beneficiary as string).toBuffer().copy(b,40);mint.toBuffer().copy(b,72);b.writeBigUInt64LE(BigInt(total),104);b.writeBigUInt64LE(released,112);b.writeBigInt64LE(start,120);b.writeBigInt64LE(cliff,128);b.writeBigInt64LE(end,136);return b;}
function mock(now:bigint,options:{initialized?:boolean;released?:bigint;vault?:bigint;source?:bigint;beneficiary?:bigint;genesis?:string;vestingOwner?:PublicKey}={}){
 const prepared=require('../scripts/prepare-rehearsal').prepareRehearsal(input,idl);
 const program=new PublicKey(input.program as string),[pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER),vesting=new PublicKey(prepared.vesting),vault=new PublicKey(prepared.vault);
 const source=getAssociatedTokenAddressSync(mint,new PublicKey(input.authority as string)),dest=getAssociatedTokenAddressSync(mint,new PublicKey(input.beneficiary as string));
 const pData=Buffer.alloc(45+deployment.maxProgramBytes);pData.writeUInt32LE(3);pData[12]=1;new PublicKey(deployment.upgradeAuthority).toBuffer().copy(pData,13);elf.copy(pData,45);
 const programData=Buffer.alloc(36);programData.writeUInt32LE(2);pd.toBuffer().copy(programData,4);
 const infos=new Map<string,any>([[program.toBase58(),{owner:LOADER,data:programData,executable:true}],[pd.toBase58(),{owner:LOADER,data:pData,executable:false}],[mint.toBase58(),{owner:TOKEN_PROGRAM_ID,data:mintData(),executable:false}],[source.toBase58(),{owner:TOKEN_PROGRAM_ID,data:tokenData(new PublicKey(input.authority as string),options.source??0n),executable:false}],[dest.toBase58(),{owner:TOKEN_PROGRAM_ID,data:tokenData(new PublicKey(input.beneficiary as string),options.beneficiary??0n),executable:false}]]);
 if(options.initialized){const vaultData=tokenData(vesting,options.vault??0n);infos.set(vesting.toBase58(),{owner:options.vestingOwner??program,data:vestingData(options.released??0n),executable:false});infos.set(vault.toBase58(),{owner:TOKEN_PROGRAM_ID,data:vaultData,executable:false});}
 const calls:string[]=[];const c:any={_rpcEndpoint:RPC,getGenesisHash:async()=>options.genesis??GENESIS,getMultipleAccountsInfoAndContext:async(keys:PublicKey[])=>({context:{slot:555},value:keys.map(k=>infos.get(k.toBase58())??null)}),getBlockTime:async()=>Number(now),getMinimumBalanceForRentExemption:async(n:number)=>n*1000,getLatestBlockhash:async()=>({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:700}),getFeeForMessage:async()=>({value:5000}),getBalance:async()=>1000000000,getSlot:async()=>555,sendTransaction:async()=>{calls.push('send');},simulateTransaction:async()=>{calls.push('simulate');}};return {c,calls};
}
test('vested arithmetic handles cliff, linear partial vesting, end and integer rounding',()=>{
 const shortEnd=start+120n;assert.equal(vestedAmount(100n,start,cliff,shortEnd,cliff-1n),0n);assert.equal(vestedAmount(100n,start,cliff,shortEnd,start+90n),75n);assert.equal(vestedAmount(100n,start,cliff,shortEnd,shortEnd),100n);
 assert.throws(()=>vestedAmount(1n,end,start,cliff,start));
});
test('initialize prepares one transaction only after exact test supply/source and empty PDAs',async()=>{
 const m=mock(start-3600n,{source:BigInt(total)});const out:any=await prepareVestingOne(m.c,'initialize',input,undefined,deployment,candidateRoot);
 assert.equal(out.operation,'initialize');assert.equal(out.rentLamports,(145+165)*1000);assert.equal(out.expectedAmountAtSnapshot,total);assert.equal(out.amountIsInstructionArgument,true);assert.equal(out.cluster,'devnet');assert.equal(out.unsignedTransactionBase64.length>0,true);assert.equal(m.calls.length,0);
 assert.equal(Transaction.from(Buffer.from(out.unsignedTransactionBase64,'base64')).instructions.length,1);assert.deepEqual(new Set(out.requiredSigners),new Set([input.payer,input.authority,input.beneficiary]));
 const bad=mock(start-3600n,{source:0n});await assert.rejects(prepareVestingOne(bad.c,'initialize',input,undefined,deployment,candidateRoot),/balances/);
});
test('deposit requires exact remaining source, zero released and exact schedule',async()=>{
 const m=mock(start+1n,{initialized:true,source:BigInt(total)});const out:any=await prepareVestingOne(m.c,'deposit',input,undefined,deployment,candidateRoot);assert.equal(out.expectedAmountAtSnapshot,total);assert.equal(out.amountIsInstructionArgument,true);assert.equal(out.rentLamports,0);assert.equal(Transaction.from(Buffer.from(out.unsignedTransactionBase64,'base64')).instructions.length,1);
 const bad=mock(start+1n,{initialized:true,source:BigInt(total)-1n});await assert.rejects(prepareVestingOne(bad.c,'deposit',input,undefined,deployment,candidateRoot),/exact full source balance/);
});
test('pre-cliff transaction is withheld inside safety window and prepared only with long expiry margin',async()=>{
 const tooClose=mock(cliff-60n,{initialized:true,vault:BigInt(total)});await assert.rejects(prepareVestingOne(tooClose.c,'release-precliff',input,undefined,deployment,candidateRoot),/30 minutes/);
 const safe=mock(cliff-BigInt(PRECLIFF_SAFETY_MARGIN_SECONDS)-1n,{initialized:true,vault:BigInt(total)});const out:any=await prepareVestingOne(safe.c,'release-precliff',input,undefined,deployment,candidateRoot);assert.equal(out.expectedAmountAtSnapshot,'0');assert.equal(out.amountIsInstructionArgument,false);assert.match(out.status,/UNSIGNED SINGLE TRANSACTION/);
});
test('partial and repeated releases require newly vested positive amounts',async()=>{
 const partial=mock(start+1800n,{initialized:true,vault:BigInt(total)});const p:any=await prepareVestingOne(partial.c,'release-partial',input,undefined,deployment,candidateRoot);assert.equal(p.expectedAmountAtSnapshot,'500000');assert.equal(p.amountIsInstructionArgument,false);assert.equal(Transaction.from(Buffer.from(p.unsignedTransactionBase64,'base64')).instructions.length,1);
 const repeated=mock(start+2400n,{initialized:true,released:500000n,vault:500000n,beneficiary:500000n});const r:any=await prepareVestingOne(repeated.c,'release-repeated',input,undefined,deployment,candidateRoot);assert.equal(r.expectedAmountAtSnapshot,'166666');
 const immediate=mock(start+1800n,{initialized:true,released:500000n,vault:500000n,beneficiary:500000n});await assert.rejects(prepareVestingOne(immediate.c,'release-repeated',input,undefined,deployment,candidateRoot),/newly accrued/);
});
test('Devnet/genesis/deployment mismatch fails before snapshots or candidate use',async()=>{
 const wrong=mock(start,{genesis:'mainnet-beta'});await assert.rejects(readVestingSnapshot(wrong.c,input,undefined,deployment,candidateRoot),/genesis/);
 const wrongPayer={...deployment,payer:beneficiary.toBase58()};const noRpc=mock(start);await assert.rejects(readVestingSnapshot(noRpc.c,input,undefined,wrongPayer,candidateRoot),/program\/payer/);
 const wrongOwner=mock(start,{initialized:true,vestingOwner:LOADER});await assert.rejects(readVestingSnapshot(wrongOwner.c,input,undefined,deployment,candidateRoot),/Vesting PDA owner/);
});
test('final release and final reconciliation require exact balances, supply and released amount',async()=>{
 const before=mock(end+1n,{initialized:true,released:750000n,vault:250000n,beneficiary:750000n});const tx:any=await prepareVestingOne(before.c,'release-final',input,undefined,deployment,candidateRoot);assert.equal(tx.expectedAmountAtSnapshot,'250000');
 const after=mock(end+1n,{initialized:true,released:BigInt(total),vault:0n,beneficiary:BigInt(total),source:0n});const s=await readVestingSnapshot(after.c,input,undefined,deployment,candidateRoot);assert.equal(reconcileFinalSnapshot(s,input).status,'FINAL RECONCILIATION PASSED');
 const short=mock(end+1n,{initialized:true,released:BigInt(total)-1n,vault:0n,beneficiary:BigInt(total)-1n,source:0n});const ss=await readVestingSnapshot(short.c,input,undefined,deployment,candidateRoot);assert.throws(()=>reconcileFinalSnapshot(ss,input),/Final reconciliation mismatch/);
});
