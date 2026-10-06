import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PublicKey,SystemProgram,Transaction,SYSVAR_CLOCK_PUBKEY} from '@solana/web3.js';
import {MPL_TOKEN_METADATA_PROGRAM_ID} from '@metaplex-foundation/mpl-token-metadata';
import {validateDistributionProposal,validateApprovedEconomics,MAINNET_GENESIS} from '../scripts/robusto-production';
import {offlineThirdReleases,thirdReleaseAmount,prepareThirdRelease,THIRD_RELEASE_WINDOWS} from '../scripts/robusto-third-release';
import {offlineCostChecklist,quoteProductionCosts} from '../scripts/robusto-cost-estimator';
import {VestingSnapshot} from '../scripts/rehearsal-vesting-one-tx';
import {GENESIS,RPC} from '../scripts/rehearsal-one-tx';

const proposal=JSON.parse(fs.readFileSync('config/robusto-distribution-proposal.json','utf8'));
test('owner distribution proposals reconcile exact tokens, raw units and 100% without recipient approval',()=>{
 const r=validateDistributionProposal(proposal);
 assert.equal(r.primary.basisPoints,10000);assert.equal(r.stagedAlternative.baseUnits,'1000000000000000');
 assert.deepEqual(r.primary.rows.map((a:any)=>a.tokens),['700000000','150000000','100000000','50000000']);
 const copy=()=>JSON.parse(JSON.stringify(proposal));
 for(const change of ['status','total','tokens','raw','duplicate','fraction']){
  const p=copy();
  if(change==='status')p.status='APPROVED';
  if(change==='total')p.primary.pop();
  if(change==='tokens')p.primary[0].tokens='700000001';
  if(change==='raw')p.stagedAlternative[0].baseUnits='0500000000000000';
  if(change==='duplicate')p.primary[0].label=p.primary[1].label;
  if(change==='fraction')p.primary[0].basisPoints=7000.5;
  assert.throws(()=>validateDistributionProposal(p));
 }
 assert.equal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')).allocations,null);
});
test('approved economics reconcile exact 50/15/30/5 without operational or circulation authorization',()=>{
 const approval=JSON.parse(fs.readFileSync('config/robusto-economics-approved.json','utf8'));
 const result=validateApprovedEconomics(approval);assert.equal(result.baseUnits,'1000000000000000');assert.equal(result.basisPoints,10000);assert.equal(result.operationsAuthorized,false);
 for(const key of ['mainnetAuthorized','mintAuthorized','transfersAuthorized','publicationAuthorized','paymentsAuthorized','signingAuthorized','authorityRevocationAuthorized'])assert.throws(()=>validateApprovedEconomics({...approval,[key]:true}));
 for(const key of ['initialCirculation','beneficiaries','vesting','custody'])assert.throws(()=>validateApprovedEconomics({...approval,[key]:'approved-by-default'}));
 for(const patch of [{decimals:9},{freezeAuthority:'wallet'},{supplyTokens:'1000000001'},{buckets:proposal.primary},{buckets:approval.buckets.slice(1)},{status:'APPROVED_FOR_MAINNET'}])assert.throws(()=>validateApprovedEconomics({...approval,...patch}));
 const production=JSON.parse(fs.readFileSync('config/robusto-production.json','utf8'));assert.equal(production.allocations,null);assert.equal(production.mainnetMode,'MAINNET_DISABLED');assert.equal(production.mintAuthorityRevocationAuthorized,false);
});
const third=JSON.parse(fs.readFileSync('config/robusto-rehearsal-3.json','utf8'));
function snapshot(released=0n):VestingSnapshot{return {slot:123,unixTime:1791289696,program:third.program,programData:'unused',mint:third.mint,decimals:6,supply:10000000n,
 vesting:'4A63yMPGnrH4XY8yFAAFK8TkRi7rJ3May1GW1DvX2tNN',vault:'CNJpJ3D9FUJcMnfpPQgxV6AxMoWbUwvGcUgtp2DmVuAT',source:'DHyysduG5SxsqiupB7Zvw32fLq14BUVBZbHKbXBqYcN6',beneficiaryAta:'9gSDUytN7u3tUk8B8h7Tmdtik8U3SScyXfHRHL2Swgby',sourceAmount:0n,vaultAmount:10000000n-released,beneficiaryAmount:released,
 vestingState:{authority:third.authority,beneficiary:third.beneficiary,mint:third.mint,total:10000000n,released,start:1791293572n,cliff:1791336772n,end:1791898372n}};}
test('frozen third release planners enforce targets, partial windows and full conservation',()=>{
 const p=offlineThirdReleases();assert.equal(p.status,'OFFLINE_PROPOSED_NOT_APPROVED');assert.equal(p.operations.final.utc,'2026-10-13T13:32:52Z');
 assert.equal(thirdReleaseAmount('first-partial',snapshot(),1791466372n),2857142n);
 assert.equal(thirdReleaseAmount('second-partial',snapshot(2857142n),1791639172n),2857143n);
 assert.equal(thirdReleaseAmount('final',snapshot(5714285n),1791898372n),4285715n);
 for(const [op,w] of Object.entries(THIRD_RELEASE_WINDOWS)){
  const s=snapshot(op==='first-partial'?0n:2857142n);
  assert.throws(()=>thirdReleaseAmount(op,s,w.notBefore-1n),/window/);
  if(w.before!==null)assert.throws(()=>thirdReleaseAmount(op,s,w.before),/window/);
 }
 assert.throws(()=>thirdReleaseAmount('first-partial',snapshot(1n),1791466372n),/repeat/);
 assert.throws(()=>thirdReleaseAmount('second-partial',snapshot(),1791639172n),/prior/);
 assert.throws(()=>thirdReleaseAmount('final',snapshot(10000000n),1791898372n),/remaining/);
 assert.throws(()=>thirdReleaseAmount('first-partial',{...snapshot(),supply:10000001n},1791466372n),/reconciliation/);
});
test('third unsigned planner uses verified Clock, rejects early windows and never signs or sends',async()=>{
 const clock=Buffer.alloc(40);clock.writeBigInt64LE(1791466372n,32);let sends=0;
 const c:any={rpcEndpoint:RPC,getGenesisHash:async()=>GENESIS,getAccountInfoAndContext:async(key:PublicKey,options:any)=>{assert(key.equals(SYSVAR_CLOCK_PUBKEY));assert.equal(options.minContextSlot,123);return {context:{slot:124},value:{owner:new PublicKey('Sysvar1111111111111111111111111111111111111'),data:clock,executable:false}};},getLatestBlockhash:async()=>({blockhash:PublicKey.default.toBase58(),lastValidBlockHeight:200}),getFeeForMessage:async()=>({value:10000}),getBalance:async()=>1000000,sendTransaction:async()=>{sends++;}};
 const observe:any=async()=>({snapshot:snapshot()});
 const result=await prepareThirdRelease('first-partial',c,observe),tx=Transaction.from(Buffer.from(result.unsignedTransactionBase64,'base64'));
 assert.equal(result.expectedAmountAtClock,'2857142');assert.equal(tx.instructions.length,1);assert(tx.signatures.every(s=>s.signature===null));
 assert.deepEqual(new Set(result.requiredSigners),new Set([third.payer,third.beneficiary]));assert.equal(sends,0);
 clock.writeBigInt64LE(1791466371n,32);await assert.rejects(prepareThirdRelease('first-partial',c,observe),/window/);
 await assert.rejects(prepareThirdRelease('final',{...c,rpcEndpoint:'https://api.mainnet-beta.solana.com'},observe),/Devnet/);
 await assert.rejects(prepareThirdRelease('deposit',c,observe),/Choose/);
});
function productionFixture(){
 // Deterministic public-address bytes only; no private keys/seeds generated.
 let counter=2;const key=()=>{while(counter<255){const k=new PublicKey(Buffer.alloc(32,counter++));if(PublicKey.isOnCurve(k.toBytes()))return k.toBase58();}throw Error('Public fixture exhausted');};
 const p={...JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')),payer:key(),mint:key(),program:key(),mintAuthority:key(),metadataUpdateAuthority:key(),upgradeAuthority:key(),metadataUri:'ar://'+'A'.repeat(43),imageSha256:'a'.repeat(64),metadataSha256:'b'.repeat(64),allocations:proposal.primary.map((a:any)=>({label:a.label,basisPoints:a.basisPoints,baseUnits:a.baseUnits,beneficiary:key(),...(a.label==='team_founder'?{vesting:{start:'1800000000',cliff:'1831536000',end:'1894608000'}}:{})}))};
 const idl={...JSON.parse(fs.readFileSync('target/idl/popecoin_vesting.json','utf8')),address:p.program},elf=Buffer.alloc(1450,1);
 Buffer.from([127,69,76,70]).copy(elf);new PublicKey(p.program).toBuffer().copy(elf,100);p.programElfSha256=createHash('sha256').update(elf).digest('hex');
 const input={status:'PROPOSED_NOT_APPROVED',network:{mainnetMode:'MAINNET_DISABLED',cluster:'mainnet-beta',rpc:'https://mock-rpc.invalid'},deployProgram:true,bufferAddress:key(),maxProgramBytes:1500,payerReserveLamports:'1000',feePolicy:'NO_PRIORITY_IN_QUOTED_MESSAGES'};
 return {p,idl,elf,input};
}
function quoteMock(p:any,input:any){
 let sends=0,simulations=0;
 const payer={owner:SystemProgram.programId,data:Buffer.alloc(0),executable:false,lamports:10000000};
 const value:any={err:null,fee:5000,preBalances:[10000000],postBalances:[9971800],accounts:[{owner:SystemProgram.programId.toBase58(),executable:false,lamports:9971800},{owner:MPL_TOKEN_METADATA_PROGRAM_ID,executable:false,lamports:10000,data:[Buffer.alloc(100).toString('base64'),'base64']}]};
 const c:any={rpcEndpoint:input.network.rpc,getGenesisHash:async()=>MAINNET_GENESIS,getAccountInfo:async()=>payer,getMultipleAccountsInfoAndContext:async(keys:PublicKey[])=>({context:{slot:123},value:keys.map(k=>k.toBase58()===p.payer?payer:null)}),getMinimumBalanceForRentExemption:async(n:number)=>n*100,getLatestBlockhash:async()=>({blockhash:PublicKey.default.toBase58(),lastValidBlockHeight:200}),getFeeForMessage:async()=>({value:5000}),_rpcRequest:async(method:string,args:any[])=>{assert.equal(method,'simulateTransaction');assert.equal(args[1].sigVerify,false);assert.equal(args[1].replaceRecentBlockhash,false);const tx=Transaction.from(Buffer.from(args[0],'base64'));assert(tx.signatures.every(s=>s.signature===null));assert.equal(tx.instructions.length,3);simulations++;return {result:{context:{slot:124},value}};},sendTransaction:async()=>{sends++;}};
 return {c,value,sent:()=>sends,simulated:()=>simulations};
}
test('technical estimator quotes loader, mint, ATAs, metadata and vesting with fresh mocked costs',async()=>{
 assert.equal(offlineCostChecklist().prices,null);
 const {p,idl,elf,input}=productionFixture(),m=quoteMock(p,input);
 const q=await quoteProductionCosts(m.c,p,idl,elf,input,`READ_ONLY:${MAINNET_GENESIS}`);
 assert.equal(q.transactionCount,18);assert.equal(q.metadata.totalExtraLamports,15000);assert.equal(q.metadata.rentLamports,10000);assert.equal(q.metadata.protocolAndOtherDebitLamports,5000);
 assert.equal(q.temporaryBufferRentLamports,153700);assert.equal(q.quotedNetTechnicalLamports,384800);assert.equal(q.conservativeFundingLamports,539500);
 assert.equal(q.completeBudget,false);assert.equal(m.simulated(),1);assert.equal(m.sent(),0);
});
test('cost estimator refuses unauthorized reads, unavailable quotes and inconsistent simulations',async()=>{
 const {p,idl,elf,input}=productionFixture(),m=quoteMock(p,input);let calls=0;
 await assert.rejects(quoteProductionCosts({getGenesisHash:async()=>{calls++;return MAINNET_GENESIS;}} as any,p,idl,elf,input,undefined),/MAINNET_DISABLED/);assert.equal(calls,0);
 for(const field of ['deployProgram','payerReserveLamports','feePolicy'])await assert.rejects(quoteProductionCosts(m.c,p,idl,elf,{...input,[field]:null},`READ_ONLY:${MAINNET_GENESIS}`));
 const broken=quoteMock(p,input);broken.value.err={InstructionError:[2,'Custom']};await assert.rejects(quoteProductionCosts(broken.c,p,idl,elf,input,`READ_ONLY:${MAINNET_GENESIS}`),/failed/);
 const fee=quoteMock(p,input);delete fee.value.fee;await assert.rejects(quoteProductionCosts(fee.c,p,idl,elf,input,`READ_ONLY:${MAINNET_GENESIS}`),/fee/);
 const rent=quoteMock(p,input);rent.value.accounts[1].lamports=9999;await assert.rejects(quoteProductionCosts(rent.c,p,idl,elf,input,`READ_ONLY:${MAINNET_GENESIS}`),/reconciliation/);
 await assert.rejects(quoteProductionCosts({...m.c,getFeeForMessage:async()=>({value:null})},p,idl,elf,input,`READ_ONLY:${MAINNET_GENESIS}`),/fee/i);
});
