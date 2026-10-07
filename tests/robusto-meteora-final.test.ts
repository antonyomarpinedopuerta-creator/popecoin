import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFinalPreflight,REVIEWED_COMMIT,REVIEWED_BINARY,concentrationCostUsd,concentrationBaseUnitTolerance,continuousSwap} from '../scripts/robusto-meteora-final-checks';
import {prepareMeteoraLocal,localPublicFixture} from '../scripts/robusto-meteora-local';
import {modelSwap} from '../scripts/robusto-local-guard';
import {runLocalRehearsal} from '../scripts/robusto-meteora-rehearsal';
const now=Date.parse('2026-10-07T01:00:00Z');
const fixture=()=>({status:'PASSED_READONLY_PREFLIGHT',sourceCommit:REVIEWED_COMMIT,binarySha256:REVIEWED_BINARY,
 selectedEnvironment:'localnet',publicTransactions:0,verifiedSourceInputs:129,checkedAtUtc:new Date(now).toISOString(),
 observations:{'mainnet-beta':{status:'VERIFIED_BYTE_MATCH_AT_OBSERVED_SLOTS',exactPrefixAndZeroPaddingMatch:true,artifactSha256:REVIEWED_BINARY}}});
test('final rehearsal preflight requires unchanged reviewed source/binary and recent read-only observation',()=>{
 assert.equal(validateFinalPreflight(fixture(),now).selectedEnvironment,'localnet');
 for(const patch of [{sourceCommit:'changed'},{binarySha256:'changed'},{selectedEnvironment:'devnet'},
 {publicTransactions:1},{verifiedSourceInputs:128},{status:'INCOMPLETE'},
 {checkedAtUtc:new Date(now-31*60000).toISOString()},{checkedAtUtc:new Date(now+1).toISOString()},
 {observations:{'mainnet-beta':{...fixture().observations['mainnet-beta'],exactPrefixAndZeroPaddingMatch:false}}}]){
  assert.throws(()=>validateFinalPreflight({...fixture(),...patch},now));
 }
});
test('concentration comparison remains monotonic and exposes the synthetic fifty-percent cost',()=>{
 assert(concentrationCostUsd(.25)<concentrationCostUsd(.5));assert(concentrationCostUsd(.5)<concentrationCostUsd(.9));
 assert(Math.abs(concentrationCostUsd(.5)-500)<.001);
 for(const f of [-1,0,1,NaN])assert.throws(()=>concentrationCostUsd(f));
});
test('continuous economic comparison is independent of integer rounding and agrees within a few base units',()=>{
 const p=prepareMeteoraLocal(localPublicFixture('100')).parameters,L=BigInt(p.liquidity),lo=BigInt(p.sqrtMinPrice),hi=BigInt(p.sqrtMaxPrice);
 for(const amount of [10000000n,50000000n,1000000000n]){
  const integer=modelSwap(L,lo,lo,hi,amount,true),continuous=continuousSwap(L,lo,amount,true);
  assert(Math.abs(Number(integer.out)-continuous.out)<5);
  assert(continuous.priceMovementPercent>0);
 }
});
test('concentration output tolerance follows quote-lamport quantization rather than an arbitrary loose percentage',()=>{
 const p=prepareMeteoraLocal(localPublicFixture('100')).parameters,lo=BigInt(p.sqrtMinPrice);
 const bound=concentrationBaseUnitTolerance(lo);
 assert(bound>=25n&&bound<400n);assert.equal(concentrationBaseUnitTolerance(lo*2n)<bound,true);
 assert.throws(()=>concentrationBaseUnitTolerance(0n));
});
test('historical execution mode and absent owner authorization fail before keys, validator or RPC',async()=>{
 await assert.rejects(()=>runLocalRehearsal(true,false),/historical execution mode disabled/);
 await assert.rejects(()=>runLocalRehearsal(false,true),/explicit authorization/);
});
