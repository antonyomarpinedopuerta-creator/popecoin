/** Explicit second-rehearsal wrapper: read/unsigned only; never generates identities. */
import fs from 'node:fs';
import {PublicKey} from '@solana/web3.js';
import {ROBUSTO,connection} from './robusto-recovery';
import {prepareVestingOne,readVestingSnapshot,reconcileFinalSnapshot,VestingStep} from './rehearsal-vesting-one-tx';
import {prepareAta,SplPlan} from './rehearsal-spl-one-tx';
import {GENESIS,RPC,readDeployment,findCandidate} from './rehearsal-one-tx';
import {prepareRehearsal} from './prepare-rehearsal';
import {Idl} from '@coral-xyz/anchor';
export function validateSecondPlan(p:any){
 if(p.status!=='PREPARATION_ONLY_NOT_AUTHORIZED'||p.cluster!=='devnet'||p.program!==ROBUSTO.program||p.mint!==ROBUSTO.mint||p.payer!==ROBUSTO.payer||p.authority!==ROBUSTO.authority||p.amount!==ROBUSTO.amount||p.mintAdditionalTokens!==false)throw Error('Second rehearsal identity/supply policy mismatch');
 if(typeof p.beneficiary!=='string'||p.beneficiary===ROBUSTO.beneficiary)throw Error('New dedicated beneficiary pending; never reuse old beneficiary');
 const b=new PublicKey(p.beneficiary);if(!PublicKey.isOnCurve(b.toBytes()))throw Error('Beneficiary must be a signer');
 // Existing offline planner rejects historical/production identities in every role.
 const idl=JSON.parse(findCandidate(readDeployment()).idlBytes.toString('utf8')) as Idl;
 prepareRehearsal({...p,startUtc:p.startUtc??'2030-01-01T00:00:00Z'},idl);
 return p;
}
async function main(){
 const [step,...extra]=process.argv.slice(2);if(extra.length)throw Error('One operation only');
 const p=validateSecondPlan(JSON.parse(fs.readFileSync('config/robusto-rehearsal-2.json','utf8')));
 if(p.checkpoint?.state==='ABANDONED_EMPTY_VAULT' && step!=='snapshot')throw Error('Second rehearsal abandoned: snapshot only; never deposit or reuse');
 const c=connection();if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis mismatch');
 let result:unknown;
 if(step==='schedule'){
  const slot=await c.getSlot('finalized'),now=await c.getBlockTime(slot);if(now===null)throw Error('Chain time unavailable');
  result={...p,startUtc:new Date((now+2400)*1000).toISOString().replace('.000Z','Z'),cliffSeconds:60,durationSeconds:3600,
   note:'Candidate schedule only; approve/freeze before initialize. Recompute if delayed. Do not overwrite after initialization.'};
 }else if(step==='ata-beneficiary'){
  result=await prepareAta(c,{...p,rpc:RPC,genesisHash:GENESIS} as SplPlan,'beneficiary');
 }else if(step==='snapshot'||step==='reconcile-final'){
  const s=await readVestingSnapshot(c,p);result=step==='snapshot'?s:reconcileFinalSnapshot(s,p);
 }else if(['initialize','deposit','release-precliff','release-partial','release-repeated','release-final'].includes(step)){
  result=await prepareVestingOne(c,step as VestingStep,p);
 }else throw Error('Choose schedule, ata-beneficiary, snapshot, initialize, deposit, release-precliff, release-partial, release-repeated, release-final or reconcile-final');
 console.log(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2));
}
if(require.main===module)main().catch(e=>{console.error((e as Error).message);process.exitCode=1;});
