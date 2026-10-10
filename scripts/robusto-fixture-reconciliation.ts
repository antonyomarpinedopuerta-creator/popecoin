/** Read-only simulated outcome reconciliation. Never authorizes execution or retry. */
import {openFixtureJournal} from './robusto-unsigned-journal';
export type FixtureOutcome = {
 scope:'OFFLINE_FIXTURE_ONLY';cluster:'SIMULATED';authorization:false;
 messageSha256:string;beforeSha256:string;expectedAfterSha256:string;
 nowMs:number;maxAgeMs:number;preparedSlot:number;
 observation:{messageSha256:string;status:'CONFIRMED'|'FAILED'|'UNKNOWN';stateSha256:string;
  slot:number;atMs:number;fee:string;maxFee:string};
};
const sha=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const integer=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
const u64=(x:unknown)=>typeof x==='string'&&/^(0|[1-9][0-9]*)$/.test(x)&&x.length<=20&&BigInt(x)<=2n**64n-1n;
export function reconcileFixtureOutcome(directory:string,input:FixtureOutcome){
 if(!input||input.scope!=='OFFLINE_FIXTURE_ONLY'||input.cluster!=='SIMULATED'||input.authorization!==false)
  throw Error('Only simulated fixture outcomes accepted');
 const o=input.observation;
 if(!sha(input.messageSha256)||!sha(input.beforeSha256)||!sha(input.expectedAfterSha256)||
    !integer(input.nowMs)||!integer(input.maxAgeMs)||!integer(input.preparedSlot)||!o||
    !sha(o.messageSha256)||!sha(o.stateSha256)||!integer(o.slot)||!integer(o.atMs)||
    !['CONFIRMED','FAILED','UNKNOWN'].includes(o.status)||!u64(o.fee)||!u64(o.maxFee))
  throw Error('Incomplete or invalid simulated outcome');
 const claim=openFixtureJournal(directory).inspect(input.messageSha256);
 let state:'SIMULATED_CONFIRMED'|'SIMULATED_FAILED_NO_EFFECT'|'UNCERTAIN'='UNCERTAIN';
 if(claim.state==='CONSUMED_NOT_AUTHORIZED'&&o.messageSha256===input.messageSha256&&
    o.slot>=input.preparedSlot&&o.atMs<=input.nowMs&&input.nowMs-o.atMs<=input.maxAgeMs&&
    BigInt(o.fee)<=BigInt(o.maxFee)&&input.beforeSha256!==input.expectedAfterSha256){
  if(o.status==='CONFIRMED'&&o.stateSha256===input.expectedAfterSha256)state='SIMULATED_CONFIRMED';
  if(o.status==='FAILED'&&o.stateSha256===input.beforeSha256)state='SIMULATED_FAILED_NO_EFFECT';
 }
 return Object.freeze({scope:'OFFLINE_FIXTURE_ONLY' as const,cluster:'SIMULATED' as const,state,
  authorization:false as const,retryAllowed:false as const,productionExecutionVerified:false as const});
}
