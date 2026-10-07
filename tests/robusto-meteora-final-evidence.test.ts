import test from 'node:test';
import assert from 'node:assert/strict';
import evidence from '../docs/evidence/robusto/meteora-final-local-runtime.json';
import preflight from '../docs/evidence/robusto/meteora-final-readonly-preflight.json';
import audit from '../docs/evidence/robusto/meteora-final-upstream-audit.json';
import earlier from '../docs/evidence/robusto/meteora-final-attempt-1.json';

test('final local runtime evidence covers concentration, multiple buyers, exhaustion, reopening and liquidity roundtrip',()=>{
 assert.equal(evidence.status,'PASSED_LOCAL_RUNTIME');assert.equal(evidence.stage,'FINAL_PREPRODUCTION_LOCAL_ONLY_NOT_MAINNET_APPROVED');
 assert.equal(evidence.transactions.length,26);assert(evidence.transactions.every(x=>x.status==='CONFIRMED_LOCAL'));
 assert.equal(evidence.negativeChecks.length,27);assert.equal(evidence.validatorStopped,true);assert.equal(evidence.authorizationExpired,true);
 assert.equal(evidence.mainnet,false);assert.equal(evidence.devnet,false);assert.equal(evidence.publicRpc,false);assert.equal(evidence.realFunds,false);
 assert.equal(evidence.modelComparisons.length,15);
 for(const x of evidence.modelComparisons){assert.equal(x.sqrtDifference,'0');assert.equal(x.outputDifferenceBaseUnits,'0');assert.equal(x.actualInput,x.model.used);}
 for(const x of evidence.snapshots){
  assert.equal(Object.values(x.balances).reduce((n,v)=>n+BigInt(v.robusto),BigInt(x.vaultA)),1000000000000000n);
  assert.equal(Object.values(x.balances).reduce((n,v)=>n+BigInt(v.wrappedSol),BigInt(x.vaultB)),121000000000n);
 }
 const exhausted=evidence.snapshots.find(x=>x.label==='buy_partial_fill_to_upper_range')!;
 assert.equal(exhausted.sqrtPrice,evidence.preparedParameters.sqrtMaxPrice);
 assert(evidence.snapshots.some(x=>x.label==='buy_after_sale_reopens_capacity'));
 assert.equal(evidence.liquidityRoundTrip.roundingCostA,'1');assert.equal(evidence.liquidityRoundTrip.roundingCostB,'1');
 assert(evidence.negativeChecks.some(x=>x.name==='wrong_position_custodian'&&'error' in x));
 assert.equal(evidence.metadataVerification,'REAL_LOCAL_GENESIS_ACCOUNT_FIXTURE_NOT_METADATA_PROGRAM_EXECUTION');
 assert(evidence.authorities.mintAuthorityUnchanged&&evidence.authorities.metadataUpdateAuthorityUnchanged&&evidence.authorities.programUpgradeAuthorityUnchanged);
});
test('final economic evidence retains fees, quantization differences and actual concentration rather than claiming protection',()=>{
 assert.deepEqual(evidence.concentrationScenarios.map(x=>x.targetPercent),[25,50,90]);
 for(const x of evidence.concentrationScenarios){
  assert(BigInt(x.targetOvershootBaseUnits)<=BigInt(x.quantizationBoundBaseUnits));
  assert(Math.abs(x.costDeltaTestUsd)<.000001);assert(x.actualInventoryPercent>=x.targetPercent);
 }
 assert.equal(evidence.economicComparisons.reduce((n,x)=>n+BigInt(x.fixedFeeLamports),0n),96342915n);
 assert.equal(evidence.economicComparisons.reduce((n,x)=>n+BigInt(x.protocolFeeLamports)+BigInt(x.lpFeeLamports),0n),96342915n);
 assert.equal(evidence.transactions.reduce((n,x)=>n+x.networkFeeLamports,0),230000);
 assert.equal(earlier.status,'FAILED_LOCAL_RUNTIME');assert.equal(earlier.validatorStopped,true);
 assert(!Object.values(evidence.identities).some(x=>Object.values(earlier.identities).includes(x)));
});
test('read-only observations distinguish current production bytes from incompatible devnet without suppressing findings',()=>{
 assert.equal(preflight.sourceCommit,'a85c926607433f23f0ea60f4ca7b1ae92f4156cb');assert.equal(preflight.selectedEnvironment,'localnet');assert.equal(preflight.publicTransactions,0);
 assert.equal(preflight.observations['mainnet-beta'].exactPrefixAndZeroPaddingMatch,true);
 assert.equal(preflight.observations.devnet.exactPrefixAndZeroPaddingMatch,false);
 assert.equal(Object.keys(preflight.publicSplPrograms).length,3);
 assert.equal(audit.exitCode,1);assert.equal(audit.vulnerabilities.length,3);assert.equal(audit.warnings.length,7);
});
