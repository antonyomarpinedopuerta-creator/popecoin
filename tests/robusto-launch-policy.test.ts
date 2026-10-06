import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLaunchPolicy,proposedVestingSchedules} from '../scripts/robusto-launch-policy';
import {vestedAmount} from '../scripts/rehearsal-vesting-one-tx';
const policy=JSON.parse(fs.readFileSync('config/robusto-launch-policy-approved.json','utf8'));
const economics=JSON.parse(fs.readFileSync('config/robusto-economics-approved.json','utf8'));
const copy=()=>JSON.parse(JSON.stringify(policy));
test('approved launch caps and delayed vesting do not authorize operations or effective transfers',()=>{
 const r=validateLaunchPolicy(policy,economics);assert.equal(r.initialMaximumTokens,'5000000');assert.equal(r.outsideInitialStageMinimumTokens,'995000000');assert.equal(r.marketTreasuryMinimumTokens,'497000000');assert.equal(r.communityTreasuryMinimumTokens,'148000000');assert.equal(r.operationsAuthorized,false);
 for(const k of ['mainnetAuthorized','mintAuthorized','transfersAuthorized','publicationAuthorized','paymentsAuthorized','signingAuthorized','authorityRevocationAuthorized'])assert.throws(()=>validateLaunchPolicy({...policy,[k]:true},economics));
 for(const change of [(p:any)=>p.initialCirculation.automaticTransfers=true,(p:any)=>p.initialCirculation.effectiveMarketTokens='3000000',(p:any)=>p.initialCirculation.maximumBaseUnits='5000000',(p:any)=>p.community.automaticFutureDisbursements=true,(p:any)=>p.community.outsideInitialCirculationTokens='147000000',(p:any)=>p.teamVesting.accrualDuringWait=true,(p:any)=>p.reserveVesting.technicalLockRequired=false,(p:any)=>p.reserveVesting.baseUtc='2026-11-01T00:00:00Z',(p:any)=>p.custody.wallets.reserve='default',(p:any)=>p.custody.definitiveIdentityCreationAuthorized=true,(p:any)=>p.metadataMutable=false]){const p=copy();change(p);assert.throws(()=>validateLaunchPolicy(p,economics));}
 assert.equal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')).allocations,null);
});
test('proposed whole-day dates fit existing vesting formula with no accrual or lump sum during waits',()=>{
 const result=proposedVestingSchedules(policy,economics,'2026-11-01T00:00:00Z');assert.equal(result.status,'PROPOSED_DATES_NOT_APPROVED');
 assert.equal(result.schedules.teamVesting.startUtc,'2027-11-01T00:00:00Z');assert.equal(result.schedules.teamVesting.endUtc,'2029-10-31T00:00:00Z');
 assert.equal(result.schedules.reserveVesting.startUtc,'2027-04-30T00:00:00Z');assert.equal(result.schedules.reserveVesting.endUtc,'2030-04-29T00:00:00Z');
 for(const role of ['teamVesting','reserveVesting']){const s=result.schedules[role],total=BigInt(s.totalBaseUnits),start=BigInt(s.start),cliff=BigInt(s.cliff),end=BigInt(s.end);assert.equal(start,cliff);assert(start<end);assert.equal(vestedAmount(total,start,cliff,end,start-1n),0n);assert.equal(vestedAmount(total,start,cliff,end,start),0n);assert.equal(vestedAmount(total,start,cliff,end,start+1n),total/(end-start));assert.equal(vestedAmount(total,start,cliff,end,start+(end-start)/2n),total/2n);assert.equal(vestedAmount(total,start,cliff,end,end),total);assert.equal(policy[role].baseUtc,null);}
 for(const date of ['2026-02-30T00:00:00Z','2026-11-01','2026-11-01T00:00:00+00:00','2026-11-01T00:00:00.000Z'])assert.throws(()=>proposedVestingSchedules(policy,economics,date));
});
