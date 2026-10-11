import './offline-safety';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import reference from './fixtures/unsigned-runtime-receipts.json';
import {initializeFixtureJournal,openFixtureJournal} from '../scripts/robusto-unsigned-journal';
import {reconcileRuntimeFixture,RuntimeFixtureReceipt,RuntimeExpectation} from '../scripts/robusto-runtime-reconciliation';
const records=reference.records as RuntimeFixtureReceipt[];
function fixture(run:(dir:string)=>void){const parent=fs.mkdtempSync(path.join(os.tmpdir(),'robusto-runtime-journal-'));try{const dir=path.join(parent,'journal');initializeFixtureJournal(dir);run(dir);}finally{fs.rmSync(parent,{recursive:true,force:true});}}
function expected(receipt:RuntimeFixtureReceipt):RuntimeExpectation{return {scope:'OFFLINE_FIXTURE_ONLY',cluster:'SIMULATED',authorization:false,
 messageSha256:receipt.messageSha256,beforeSha256:receipt.beforeSha256,expectedAfterSha256:records[0].committedSha256,
 nowMs:1100,maxAgeMs:500,preparedSlot:10,observation:{slot:10,atMs:1000,fee:'0',maxFee:'0'}};}
function reserve(dir:string,r:RuntimeFixtureReceipt){openFixtureJournal(dir).reserve(r.messageSha256);}

test('runtime reference receipts bind exact harness sources and match successful balances fixture',()=>{
 for(const [name,hash] of Object.entries(reference.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'),hash);
 const r=records[0];fixture(dir=>{reserve(dir,r);const result=reconcileRuntimeFixture(dir,r,expected(r));
  assert.equal(result.state,'SIMULATED_CONFIRMED');assert.equal(result.authorization,false);assert.equal(result.nativeAtomicityVerified,false);
  assert.equal(result.retryAllowed,false);assert.equal(result.productionExecutionVerified,false);});
});
test('actual failed SBF sequences reconcile only discarded fixture state and retain raw partial effects',()=>{
 for(const r of [records[1],records[2],records[4]])fixture(dir=>{reserve(dir,r);
  const result=reconcileRuntimeFixture(dir,r,expected(r));assert.equal(result.state,'SIMULATED_FAILED_NO_EFFECT');
  assert.equal(result.rawEffectsDiscarded,true);assert.equal(result.nativeAtomicityVerified,false);assert.equal(result.retryAllowed,false);});
});
test('interruption after last instruction never confirms and reservation survives reopening',()=>{
 const r=records[3];fixture(dir=>{reserve(dir,r);
  assert.equal(r.executedInstructions,r.plannedInstructions);
  assert.equal(reconcileRuntimeFixture(dir,r,expected(r)).state,'UNCERTAIN');
  assert.equal(openFixtureJournal(dir).inspect(r.messageSha256).state,'CONSUMED_NOT_AUTHORIZED');
  assert.throws(()=>openFixtureJournal(dir).reserve(r.messageSha256),/Duplicate or uncertain/);
  assert.equal(reconcileRuntimeFixture(dir,r,expected(r)).state,'UNCERTAIN');});
});
test('missing claims, changed expectations, unknown and inconsistent receipts never confirm',()=>{
 const r=records[0];fixture(dir=>{
  assert.equal(reconcileRuntimeFixture(dir,r,expected(r)).state,'UNCERTAIN');reserve(dir,r);
  const variants:RuntimeFixtureReceipt[]=[{...r,status:'INTERRUPTED'},{...r,status:'INVALID_FIXTURE'},
   {...r,plannedInstructions:0,executedInstructions:0},{...r,stagedSha256:r.beforeSha256},
   {...r,beforeSha256:'e'.repeat(64)},{...r,messageSha256:'e'.repeat(64)}];
  for(const altered of variants)assert.equal(reconcileRuntimeFixture(dir,altered,expected(r)).state,'UNCERTAIN');
  assert.equal(reconcileRuntimeFixture(dir,r,{...expected(r),expectedAfterSha256:'f'.repeat(64)}).state,'UNCERTAIN');
  assert.equal(reconcileRuntimeFixture(dir,r,{...expected(r),nowMs:1600}).state,'UNCERTAIN');
 });
});
test('receipt authority flags and malformed evidence fail closed',()=>{
 const r=records[0];fixture(dir=>{reserve(dir,r);
  for(const changes of [{scope:'MAINNET'},{authorization:true},{mainnetDisabled:false},{nativeAtomicityVerified:true},
    {syntheticSignerPermissions:false},{retryAllowed:true},{messageSha256:'invalid'},{executedInstructions:999},
    {plannedInstructions:-1},{computeUnits:NaN},{status:'CONFIRMED'}])
   assert.throws(()=>reconcileRuntimeFixture(dir,{...r,...changes} as RuntimeFixtureReceipt,expected(r)));
 });
});
test('corrupt recovered claim prevents duplicate accounting without modifying journal evidence',()=>{
 const r=records[0];fixture(dir=>{reserve(dir,r);const file=path.join(dir,r.messageSha256,'record.json');
  fs.writeFileSync(file,'incomplete');const before=fs.readFileSync(file);
  assert.equal(reconcileRuntimeFixture(dir,r,expected(r)).state,'UNCERTAIN');
  assert.deepEqual(fs.readFileSync(file),before);assert.throws(()=>openFixtureJournal(dir).reserve(r.messageSha256),/Duplicate or uncertain/);
 });
});
