/** Frozen third rehearsal planners. Offline or read-only unsigned preparation; never sign/send. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PublicKey,Transaction,TransactionInstruction,SYSVAR_CLOCK_PUBKEY} from '@solana/web3.js';
import {pinThirdPlan,thirdStatus} from './robusto-third-status';
import {connection} from './robusto-recovery';
import {GENESIS,RPC,findCandidate,readDeployment} from './rehearsal-one-tx';
import {prepareRehearsal} from './prepare-rehearsal';
import {VestingSnapshot,vestedAmount} from './rehearsal-vesting-one-tx';

export const THIRD_RELEASE_WINDOWS={
 'first-partial':{notBefore:1791466372n,before:1791552772n,utc:'2026-10-08T13:32:52Z'},
 'second-partial':{notBefore:1791639172n,before:1791876772n,utc:'2026-10-10T13:32:52Z'},
 'final':{notBefore:1791898372n,before:null,utc:'2026-10-13T13:32:52Z'},
} as const;
export type ThirdOperation=keyof typeof THIRD_RELEASE_WINDOWS;
function operation(value:string):ThirdOperation{
 if(!Object.prototype.hasOwnProperty.call(THIRD_RELEASE_WINDOWS,value))throw Error('Choose first-partial, second-partial or final');return value as ThirdOperation;
}
function plan(){return pinThirdPlan(JSON.parse(fs.readFileSync('config/robusto-rehearsal-3.json','utf8')));}
function releaseInstruction(p:any){
 const idl=JSON.parse(findCandidate(readDeployment()).idlBytes.toString());
 const prepared=prepareRehearsal(p,idl),release=prepared.steps.find(s=>s.name==='release');
 if(!release)throw Error('Pinned release instruction unavailable');
 return new TransactionInstruction({programId:new PublicKey(release.program),keys:release.accounts.map(a=>({pubkey:new PublicKey(a.address),isSigner:a.signer,isWritable:a.writable})),data:Buffer.from(release.dataHex,'hex')});
}
export function offlineThirdReleases(){
 const p=plan(),ix=releaseInstruction(p);
 return {status:'OFFLINE_PROPOSED_NOT_APPROVED',cluster:'devnet',program:p.program,mint:p.mint,payer:p.payer,beneficiary:p.beneficiary,
  operations:THIRD_RELEASE_WINDOWS,instruction:{program:ix.programId.toBase58(),accounts:ix.keys.map(k=>({address:k.pubkey.toBase58(),signer:k.isSigner,writable:k.isWritable})),dataHex:ix.data.toString('hex')},
  notes:['No RPC, blockhash, signatures or submission.','Release has no amount argument; actual amount depends on Clock at inclusion.','Expired partial windows require owner review; no automatic catch-up or retiming.']};
}
export function thirdReleaseAmount(name:string,s:VestingSnapshot,clock:bigint){
 const op=operation(name),p=plan(),v=s.vestingState,w=THIRD_RELEASE_WINDOWS[op];
 if(!v||s.program!==p.program||s.mint!==p.mint||s.decimals!==6||v.authority!==p.authority||v.beneficiary!==p.beneficiary||v.mint!==p.mint||v.total!==10000000n||v.start!==1791293572n||v.cliff!==1791336772n||v.end!==1791898372n||s.supply!==v.total||s.sourceAmount!==0n||s.vaultAmount===null||s.vaultAmount<0n||v.released<0n||v.released>v.total||s.beneficiaryAmount!==v.released||s.vaultAmount+s.beneficiaryAmount!==v.total)throw Error('Frozen third rehearsal state/reconciliation mismatch');
 if(clock<w.notBefore||(w.before!==null&&clock>=w.before))throw Error('Outside frozen target release window; no unsigned transaction prepared');
 if(op==='first-partial'&&v.released!==0n)throw Error('First partial already released; never repeat');
 if(op==='second-partial'&&v.released===0n)throw Error('Second partial requires a prior finalized release');
 const amount=vestedAmount(v.total,v.start,v.cliff,v.end,clock)-v.released;
 if(amount<=0n||amount>s.vaultAmount||(op!=='final'&&amount>=v.total))throw Error('No valid remaining release at on-chain Clock');
 return amount;
}
export async function prepareThirdRelease(name:string,c=connection(),observe=thirdStatus){
 operation(name);const p=plan();
 if(c.rpcEndpoint!==RPC||await c.getGenesisHash()!==GENESIS)throw Error('Devnet endpoint/genesis required');
 const observation=await observe(c),s=observation.snapshot;
 const clock=await c.getAccountInfoAndContext(SYSVAR_CLOCK_PUBKEY,{commitment:'finalized',minContextSlot:s.slot}),info=clock.value;
 if(clock.context.slot<s.slot||!info||info.executable||info.data.length!==40||info.owner.toBase58()!=='Sysvar1111111111111111111111111111111111111')throw Error('Verified on-chain Clock required');
 const now=info.data.readBigInt64LE(32),amount=thirdReleaseAmount(name,s,now),latest=await c.getLatestBlockhash('finalized');
 const tx=new Transaction({feePayer:new PublicKey(p.payer),recentBlockhash:latest.blockhash}).add(releaseInstruction(p));
 const fee=(await c.getFeeForMessage(tx.compileMessage(),'finalized')).value,balance=await c.getBalance(new PublicKey(p.payer),'finalized');
 if(fee===null||!Number.isSafeInteger(fee)||fee<0||fee>10000||!Number.isSafeInteger(balance)||balance<fee)throw Error('Exact fee exceeds rehearsal cap or payer funding unavailable');
 const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});if(bytes.length>1232)throw Error('Packet limit exceeded');
 if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis changed');
 return {status:'UNSIGNED_NOT_SIMULATED_NOT_AUTHORIZED_NOT_SENT',operation:name,cluster:'devnet',rpc:RPC,genesis:GENESIS,program:p.program,mint:p.mint,payer:p.payer,beneficiary:p.beneficiary,
  snapshotSlot:s.slot,clockSlot:clock.context.slot,chainTime:now.toString(),expectedAmountAtClock:amount.toString(),amountIsInstructionArgument:false,feeLamports:fee,rentLamports:0,
  requiredSigners:tx.signatures.map(x=>x.publicKey.toBase58()),blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,messageSha256:createHash('sha256').update(tx.serializeMessage()).digest('hex'),unsignedTransactionBase64:bytes.toString('base64'),
  notes:['Account state and Clock are separate finalized reads; revalidate and simulate before approval.','Actual amount depends on Clock at transaction inclusion.','Fresh per-operation approval and external wallet signing required; this tool does neither.']};
}
if(require.main===module){(async()=>{
 const [mode='offline',name,...extra]=process.argv.slice(2);
 if(extra.length||(mode==='offline'&&name!==undefined)||!['offline','unsigned'].includes(mode))throw Error('Use offline or unsigned <first-partial|second-partial|final>');
 const result=mode==='offline'?offlineThirdReleases():await prepareThirdRelease(name??'');
 console.log(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2));
})().catch(e=>{console.error((e as Error).message);process.exitCode=1;});}
