import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initializeFixtureJournal,openFixtureJournal} from '../scripts/robusto-unsigned-journal';
import {FixtureOutcome,reconcileFixtureOutcome} from '../scripts/robusto-fixture-reconciliation';
const digest='a'.repeat(64),before='b'.repeat(64),after='c'.repeat(64);
function fixture(){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'robusto-outcome-')),root=path.join(parent,'journal');initializeFixtureJournal(root);
 const input:FixtureOutcome={scope:'OFFLINE_FIXTURE_ONLY',cluster:'SIMULATED',authorization:false,messageSha256:digest,
  beforeSha256:before,expectedAfterSha256:after,nowMs:1100,maxAgeMs:100,preparedSlot:10,
  observation:{messageSha256:digest,status:'CONFIRMED',stateSha256:after,slot:10,atMs:1000,fee:'5',maxFee:'5'}};
 return {parent,root,input};
}
test('simulated confirmed and failed outcomes reconcile after journal reopen without releasing claims',()=>{
 for(const status of ['CONFIRMED','FAILED'] as const){const f=fixture();try{
  openFixtureJournal(f.root).reserve(digest);f.input.observation.status=status;
  f.input.observation.stateSha256=status==='CONFIRMED'?after:before;
  const file=path.join(f.root,digest,'record.json'),bytes=fs.readFileSync(file);
  for(let restart=0;restart<2;restart++){
   const result=reconcileFixtureOutcome(f.root,structuredClone(f.input));
   assert.equal(result.state,status==='CONFIRMED'?'SIMULATED_CONFIRMED':'SIMULATED_FAILED_NO_EFFECT');
   assert.equal(result.retryAllowed,false);assert.equal(result.authorization,false);assert.equal(result.productionExecutionVerified,false);
  }
  assert.deepEqual(fs.readFileSync(file),bytes);assert.throws(()=>openFixtureJournal(f.root).reserve(digest));
 }finally{fs.rmSync(f.parent,{recursive:true,force:true});}}
});
test('missing claims, unknown outcomes, contradictory evidence and stale snapshots remain uncertain',()=>{
 for(const mode of ['unreserved','corrupt','unknown','digest','state','failed-effect','old','future','slot','fee','ambiguous']){
  const f=fixture();try{
   if(mode!=='unreserved')openFixtureJournal(f.root).reserve(digest);
   if(mode==='corrupt')fs.writeFileSync(path.join(f.root,digest,'record.json'),'{');
   const o=f.input.observation;
   if(mode==='unknown')o.status='UNKNOWN';if(mode==='digest')o.messageSha256=before;
   if(mode==='state')o.stateSha256=before;if(mode==='failed-effect')o.status='FAILED';
   if(mode==='old')o.atMs=999;if(mode==='future')o.atMs=1101;if(mode==='slot')o.slot=9;
   if(mode==='fee')o.fee='6';if(mode==='ambiguous')f.input.expectedAfterSha256=before;
   assert.equal(reconcileFixtureOutcome(f.root,f.input).state,'UNCERTAIN',mode);
  }finally{fs.rmSync(f.parent,{recursive:true,force:true});}
 }
});
test('production scope and missing or malformed reconciliation evidence fail closed',()=>{
 for(const mutate of [(i:any)=>i.scope='PRODUCTION',(i:any)=>i.authorization=true,(i:any)=>delete i.observation,
  (i:any)=>i.observation.fee='18446744073709551616',(i:any)=>i.observation.status='SUCCESS',
  (i:any)=>i.nowMs=NaN,(i:any)=>i.beforeSha256='bad']){
  const f=fixture();try{mutate(f.input);assert.throws(()=>reconcileFixtureOutcome(f.root,f.input));}
  finally{fs.rmSync(f.parent,{recursive:true,force:true});}
 }
});
