import test from 'node:test';
import assert from 'node:assert/strict';
import evidence from '../docs/evidence/robusto/meteora-local-runtime.json';
import audit from '../docs/evidence/robusto/meteora-upstream-audit.json';
import config from '../config/robusto-meteora-local.json';

test('public rehearsal evidence conserves supply and wSOL across trades and liquidity changes',()=>{
 assert.equal(evidence.status,'PASSED_LOCAL_RUNTIME');assert.equal(evidence.cluster,'localnet');assert.equal(evidence.rpcUrl,'http://127.0.0.1:8899');assert.equal(evidence.authorizationExpired,true);assert.equal(evidence.validatorStopped,true);
 assert.deepEqual(evidence.approval,config);assert.equal(evidence.transactions.length,17);assert(evidence.transactions.every(t=>t.status==='CONFIRMED_LOCAL'));
 assert.equal(evidence.negativeChecks.length,18);assert.equal(new Set(Object.values(evidence.identities)).size,10);
 for(const s of evidence.snapshots){
  const totalA=Object.values(s.balances).reduce((n,v)=>n+BigInt(v.robusto),BigInt(s.vaultA));
  const totalB=Object.values(s.balances).reduce((n,v)=>n+BigInt(v.wrappedSol),BigInt(s.vaultB));
  assert.equal(totalA,1000000000000000n);assert.equal(totalB,121000000000n);
 }
 assert.equal(evidence.snapshots[0].vaultA,'1000000000000');assert.equal(evidence.snapshots[0].vaultB,'1');
 const upper=evidence.snapshots.find(x=>x.label==='buy_partial_fill_to_upper_range')!;
 assert.equal(upper.sqrtPrice,evidence.preparedParameters.sqrtMaxPrice);assert.equal(upper.vaultA,'1');
 for(const m of evidence.modelComparisons){assert.equal(m.sqrtDifference,'0');assert.equal(m.outputDifferenceBaseUnits,'0');assert.equal(m.actualInput,m.model.used);assert.equal(m.actualOutput,m.model.out);}
 assert.equal(evidence.liquidityRoundTrip.roundingCostA,'1');assert.equal(evidence.liquidityRoundTrip.roundingCostB,'1');
 for(const key of ['mainnet','devnet','publicRpc','realFunds'] as const)assert.equal(evidence[key],false);
});
test('upstream vulnerability evidence remains a production blocker rather than a passing audit',()=>{
 assert.equal(audit.status,'BLOCKED_FOR_PRODUCTION_REVIEW');assert.equal(audit.exitCode,1);assert.equal(audit.vulnerabilities.length,3);assert.equal(audit.warnings.length,7);
 assert.deepEqual(audit.vulnerabilities.map(x=>x.id).sort(),['RUSTSEC-2025-0137','RUSTSEC-2026-0007','RUSTSEC-2026-0220']);
 assert.equal(evidence.metadataVerification,'REAL_LOCAL_GENESIS_ACCOUNT_FIXTURE_NOT_METADATA_PROGRAM_EXECUTION');
 assert.equal(evidence.authorities.mintAuthorityUnchanged,true);assert.equal(evidence.authorities.metadataUpdateAuthorityUnchanged,true);assert.equal(evidence.authorities.programUpgradeAuthorityUnchanged,true);assert.equal(evidence.authorities.permanentLock,false);
});
