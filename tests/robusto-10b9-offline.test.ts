import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PROFILE, DECIMALS, SUPPLY_TOKENS, SUPPLY_BASE_UNITS, U64_MAX,
  buildOfflineManifest, decimalTokensToBaseUnits, renderOfflineManifest,
  validateOfflineConfig, wholeTokensToBaseUnits,
} from '../scripts/robusto-10b9-offline';

const configPath = 'config/robusto-tokenomics-10b9-alternative.json';
const fixture = (): any => JSON.parse(fs.readFileSync(configPath, 'utf8'));

test('supply is exactly 10B tokens / 10^19 base units and fits u64', () => {
  const manifest = buildOfflineManifest(fixture());
  assert.equal(SUPPLY_TOKENS, 10_000_000_000n);
  assert.equal(SUPPLY_BASE_UNITS, 10n ** 19n);
  assert.equal(manifest.tokenomics.supplyBaseUnits, '10000000000000000000');
  assert.ok(SUPPLY_BASE_UNITS <= U64_MAX);
  assert.equal(manifest.tokenomics.u64Max, U64_MAX.toString());
  assert.equal(manifest.tokenomics.u64Headroom, (U64_MAX - SUPPLY_BASE_UNITS).toString());
});

test('five exact allocations conserve supply, founder remains exactly one million', () => {
  const allocations = buildOfflineManifest(fixture()).tokenomics.allocations;
  assert.deepEqual(allocations.map(({label, tokens, basisPoints}) => [label, tokens, basisPoints]), [
    ['liquidity_market', '4000000000', '4000'],
    ['community', '3000000000', '3000'],
    ['strategic_reserve', '1500000000', '1500'],
    ['development_operations', '1499000000', '1499'],
    ['founder', '1000000', '1'],
  ]);
  assert.equal(allocations[4].baseUnits, '1000000000000000');
  assert.equal(allocations.reduce((sum, item) => sum + BigInt(item.baseUnits), 0n), SUPPLY_BASE_UNITS);
  const wrongFounder = fixture();
  wrongFounder.allocations.find((row: any) => row.label === 'founder').tokens = '1000001';
  assert.throws(() => validateOfflineConfig(wrongFounder));
});

test('decimals are nine and exact unit conversion rejects fractional allocation entries', () => {
  const manifest = buildOfflineManifest(fixture());
  assert.equal(DECIMALS, 9);
  assert.equal(manifest.tokenomics.decimals, 9);
  assert.equal(wholeTokensToBaseUnits('4000000000'), 4_000_000_000_000_000_000n);
  assert.throws(() => wholeTokensToBaseUnits('1.5'));
  assert.throws(() => wholeTokensToBaseUnits('-1'));
});

test('decimal conversion is exact at the u64 boundary and rejects overflow', () => {
  assert.equal(decimalTokensToBaseUnits('18446744073.709551615'), U64_MAX);
  assert.equal(decimalTokensToBaseUnits('0.000000001'), 1n);
  assert.throws(() => decimalTokensToBaseUnits('18446744073.709551616'), /u64/);
  assert.throws(() => decimalTokensToBaseUnits('0.0000000001'));
  assert.throws(() => decimalTokensToBaseUnits('-0.1'));
});

test('rejects a changed allocation sum', () => {
  const value = fixture();
  value.allocations.find((row: any) => row.label === 'community').tokens = '2999999999';
  assert.throws(() => validateOfflineConfig(value));
});

test('rejects changed supply in either human or base units', () => {
  for (const [key, value] of [['supplyTokens', '9999999999'], ['supplyBaseUnits', '9999999999000000000']]) {
    const changed = fixture();
    changed[key] = value;
    assert.throws(() => validateOfflineConfig(changed));
  }
});

test('rejects wrong decimals and attempted legacy-profile substitution', () => {
  const changed = fixture();
  changed.decimalsAssumption = 6;
  assert.throws(() => validateOfflineConfig(changed));
  assert.equal(PROFILE, 'ROBUSTO_10B_9_OFFLINE');
  assert.notEqual(PROFILE, 'ROBUSTO_PRODUCTION_1B_6');
});

test('rejects negative, fractional, malformed and overflowing allocation amounts', () => {
  for (const tokens of ['-1', '1.5', '1e10', '01', '18446744074']) {
    const changed = fixture();
    changed.allocations[0].tokens = tokens;
    assert.throws(() => validateOfflineConfig(changed));
  }
});

test('rejects duplicate, missing, unknown and extra allocation assignments', () => {
  const duplicate = fixture();
  duplicate.allocations[4].label = 'community';
  assert.throws(() => validateOfflineConfig(duplicate));
  const missing = fixture();
  missing.allocations.pop();
  assert.throws(() => validateOfflineConfig(missing));
  const extra = fixture();
  extra.allocations.push({label: 'founder_extra', tokens: '0', basisPoints: 0});
  assert.throws(() => validateOfflineConfig(extra));
  const unknown = fixture();
  unknown.allocations[0].authority = 'unexpected';
  assert.throws(() => validateOfflineConfig(unknown));
});

test('rejects JS numbers for token amounts, including unsafe integers', () => {
  for (const value of [10_000_000_000, Number.MAX_SAFE_INTEGER + 1]) {
    const changed = fixture();
    changed.supplyTokens = value;
    assert.throws(() => validateOfflineConfig(changed));
  }
  const changed = fixture();
  changed.allocations[0].tokens = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateOfflineConfig(changed));
  assert.throws(() => decimalTokensToBaseUnits(10_000_000_000));
});

test('rejects runtime flags, network fields and unknown configuration properties', () => {
  assert.throws(() => renderOfflineManifest(['--cluster', 'mainnet-beta']));
  assert.throws(() => renderOfflineManifest(['--rpc', 'https://example.invalid']));
  for (const field of ['cluster', 'rpcUrl', 'connection', 'mainnet', 'devnet']) {
    const changed = fixture();
    changed[field] = field === 'mainnet' || field === 'devnet' ? true : 'unexpected';
    assert.throws(() => validateOfflineConfig(changed));
  }
  const changedNote = fixture();
  changedNote.note = 'production approved';
  assert.throws(() => validateOfflineConfig(changedNote));
});

test('manifest contains unresolved authorities, addresses, beneficiaries and schedules', () => {
  const pending = buildOfflineManifest(fixture()).decisionsPending;
  assert.equal(pending.addresses, null);
  assert.deepEqual(pending.authorities, {mint: null, freeze: null, metadataUpdate: null, programUpgrade: null});
  assert.equal(pending.beneficiaries, null);
  assert.equal(pending.founderVesting.beneficiary, null);
  assert.equal(pending.founderVesting.baseUtc, null);
  assert.equal(pending.founderVesting.approved, false);
  assert.equal(pending.initialCirculationTokens, null);
  assert.equal(pending.price, null);
});

test('manifest explicitly excludes keys, signatures, instructions, transactions and RPC', () => {
  const manifest = buildOfflineManifest(fixture());
  assert.deepEqual(manifest.outputs, {
    solanaInstructions: false,
    transactions: false,
    signatures: false,
    privateKeys: false,
    rpcRequests: false,
  });
  assert.equal(manifest.mode.status, 'OFFLINE_FIXTURE_ONLY');
  assert.equal(manifest.mode.mainnetStatus, 'NOT_AUTHORIZED_FOR_MAINNET');
  assert.equal(manifest.mode.mainnetDisabled, true);
  assert.equal(manifest.mode.operationsAuthorized, false);
  assert.equal(manifest.mode.productionAdoption, false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'instructions'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'transaction'), false);
});

test('manifest is deterministic and allocation input order cannot change its digest', () => {
  const first = buildOfflineManifest(fixture());
  const second = buildOfflineManifest(fixture());
  assert.deepEqual(first, second);
  const reordered = fixture();
  reordered.allocations.reverse();
  assert.deepEqual(buildOfflineManifest(reordered), first);
  assert.match(first.manifestSha256, /^[0-9a-f]{64}$/);
});

test('constructor is independent of the historical builder and does not read environment', () => {
  const source = fs.readFileSync('scripts/robusto-10b9-offline.ts', 'utf8');
  assert.match(source, /config\/robusto-tokenomics-10b9-alternative\.json/);
  assert.doesNotMatch(source, /robusto-production\.ts|robusto-10b-simulation\.json/);
  assert.doesNotMatch(source, /process\.env|@solana|Keypair|Connection|fetch\s*\(|https?:\/\//);
  assert.equal(buildOfflineManifest(fixture()).profile, PROFILE);
});

test('production and fixed-supply decisions are not silently inferred', () => {
  const manifest = buildOfflineManifest(fixture());
  assert.equal(manifest.mode.productionAdoption, false);
  assert.equal(manifest.decisionsPending.authorities.mint, null);
  assert.equal(manifest.decisionsPending.authorities.freeze, null);
  assert.equal(fixture().operationsAuthorized, false);
});

test('CLI output is stable JSON and rejects all positional or option arguments', () => {
  const output = renderOfflineManifest([]);
  assert.equal(output, renderOfflineManifest([]));
  const parsed = JSON.parse(output);
  assert.equal(parsed.manifestSha256, buildOfflineManifest(fixture()).manifestSha256);
  assert.throws(() => renderOfflineManifest(['anything']));
});
