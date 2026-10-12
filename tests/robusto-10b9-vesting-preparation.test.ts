import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildOfflineManifest} from '../scripts/robusto-10b9-offline';
import {
  FOUNDER_AMOUNT_BASE_UNITS,
  I64_MAX,
  buildVestingPreparation,
  renderVestingPreparation,
  validateFounderReleaseAccounting,
  validateHypotheticalFounderSchedule,
} from '../scripts/robusto-10b9-vesting-preparation';

function fixtureManifest(): any {
  const config = JSON.parse(fs.readFileSync('config/robusto-tokenomics-10b9-alternative.json', 'utf8'));
  return buildOfflineManifest(config);
}

function schedule(overrides: Record<string, unknown> = {}) {
  return {
    activationRequested: true,
    beneficiaryReference: 'synthetic-reference-for-arithmetic-test-only',
    baseUnixSeconds: '1800000000',
    totalAmountBaseUnits: '1000000000000000',
    lockDays: 365,
    releaseDays: 730,
    ...overrides,
  };
}

test('adapter requires the exact validated manifest and keeps all five categories separate', () => {
  const plan = buildVestingPreparation(fixtureManifest());
  assert.deepEqual(buildVestingPreparation(fixtureManifest()), plan);
  assert.match(plan.planSha256, /^[0-9a-f]{64}$/);
  assert.equal(plan.profile, 'ROBUSTO_10B_9_OFFLINE');
  assert.equal(plan.status, 'OFFLINE_FIXTURE_ONLY');
  assert.deepEqual(plan.vestingProgram.signerRoles, {
    initialize: ['payer', 'authority', 'beneficiary'],
    deposit: ['authority'],
    release: ['beneficiary'],
  });
  assert.equal(plan.vestingProgram.authorityDecision, 'PENDING');
  assert.equal(plan.allocationPlan.length, 5);
  assert.deepEqual(plan.allocationPlan.map(({label, amountTokens}) => [label, amountTokens]), [
    ['liquidity_market', '4000000000'],
    ['community', '3000000000'],
    ['strategic_reserve', '1500000000'],
    ['development_operations', '1499000000'],
    ['founder', '1000000'],
  ]);
  const altered = fixtureManifest();
  altered.tokenomics.allocations[4].baseUnits = '1000000000000001';
  assert.throws(() => buildVestingPreparation(altered), /differs from the validated local/);
});

test('founder amount converts to exactly 1,000,000,000,000,000 base units', () => {
  const plan = buildVestingPreparation(fixtureManifest());
  assert.equal(FOUNDER_AMOUNT_BASE_UNITS, 1_000_000_000_000_000n);
  assert.equal(plan.vestingAccounting.founderAllocationBaseUnits, '1000000000000000');
  assert.equal(plan.vestingAccounting.maximumFounderReleaseBaseUnits, '1000000000000000');
  assert.equal(BigInt(plan.vestingAccounting.founderAllocationBaseUnits), FOUNDER_AMOUNT_BASE_UNITS);
  assert.ok(FOUNDER_AMOUNT_BASE_UNITS <= (1n << 64n) - 1n);
});

test('365/730 is only an unapproved relative-time scenario with unresolved identity and base date', () => {
  const plan = buildVestingPreparation(fixtureManifest());
  const founder = plan.allocationPlan.find((entry) => entry.label === 'founder')!;
  assert.equal(founder.treatment, 'FOUNDER_VESTING_SCENARIO_PENDING_APPROVAL');
  assert.deepEqual(founder.vestingScenario, {
    beneficiary: null,
    baseUnixSeconds: null,
    startOffsetSeconds: '31536000',
    cliffOffsetSeconds: '31536000',
    releaseDurationSeconds: '63072000',
    endOffsetSeconds: '94608000',
    approved: false,
  });
  assert.ok(plan.allocationPlan.filter((entry) => entry.label !== 'founder').every((entry) => entry.vestingScenario === null));
  assert.equal(plan.vestingAccounting.activationPending, true);
});

test('five allocations conserve 10^19 base units, below u64 maximum', () => {
  const plan = buildVestingPreparation(fixtureManifest());
  assert.equal(plan.vestingAccounting.totalAllocationBaseUnits, '10000000000000000000');
  assert.equal(BigInt(plan.vestingAccounting.totalAllocationBaseUnits), 10n ** 19n);
  assert.equal(plan.vestingAccounting.allocationsConserved, true);
  assert.equal(plan.vestingAccounting.aboveU64, false);
});

test('hypothetical absolute schedule uses exact seconds and rejects invalid dates or durations', () => {
  const result = validateHypotheticalFounderSchedule(schedule());
  assert.equal(result.startUnixSeconds, (1_800_000_000n + 365n * 86_400n).toString());
  assert.equal(result.cliffUnixSeconds, result.startUnixSeconds);
  assert.equal(result.endUnixSeconds, (1_800_000_000n + 1_095n * 86_400n).toString());
  assert.equal(result.status, 'OFFLINE_HYPOTHETICAL_ONLY');
  assert.equal(result.authorizationGranted, false);
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({baseUnixSeconds: '-1'})));
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({baseUnixSeconds: '01'})));
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({baseUnixSeconds: (I64_MAX - 1n).toString()})), /i64/);
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({lockDays: 366})));
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({releaseDays: 0})));
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({releaseDays: 731})));
});

test('a hypothetical activation candidate requires explicit request and a beneficiary reference', () => {
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({activationRequested: false})), /activationRequested/);
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({beneficiaryReference: ''})), /Beneficiary reference/);
  assert.throws(() => validateHypotheticalFounderSchedule(({...schedule(), beneficiaryReference: undefined})), /Beneficiary reference/);
});

test('hypothetical schedule rejects founder amounts that differ from the assignment', () => {
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({totalAmountBaseUnits: '999999999999999'})), /exactly match/);
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({totalAmountBaseUnits: '18446744073709551616'})), /integer range/);
  assert.throws(() => validateHypotheticalFounderSchedule(schedule({totalAmountBaseUnits: 1_000_000_000_000_000})), /canonical unsigned/);
});

test('release accounting rejects amounts beyond founder allocation and inconsistent state', () => {
  assert.deepEqual(validateFounderReleaseAccounting('500000000000000', '750000000000000'), {
    assignedBaseUnits: '1000000000000000',
    releasedBaseUnits: '500000000000000',
    vestedBaseUnits: '750000000000000',
    releasableBaseUnits: '250000000000000',
  });
  assert.throws(() => validateFounderReleaseAccounting('1000000000000001', '1000000000000001'), /cannot exceed/);
  assert.throws(() => validateFounderReleaseAccounting('800000000000000', '700000000000000'), /cannot exceed vested/);
  assert.throws(() => validateFounderReleaseAccounting('-1', '0'));
});

test('old profile, edited digest, addresses, instructions and operational outputs are rejected or absent', () => {
  const plan = buildVestingPreparation(fixtureManifest());
  assert.equal(plan.vestingProgram.instructionDataGenerated, false);
  assert.equal(plan.vestingProgram.accountsOrAddressesGenerated, false);
  assert.deepEqual(plan.outputs, {
    instructions: false,
    transactions: false,
    signatures: false,
    privateKeys: false,
    rpcRequests: false,
  });
  assert.equal(plan.vestingAccounting.recoveryAuthority, null);
  const oldProfile = fixtureManifest();
  oldProfile.profile = 'ROBUSTO_PRODUCTION_1B_6';
  assert.throws(() => buildVestingPreparation(oldProfile));
  const historicProduction = JSON.parse(fs.readFileSync('config/robusto-production.json', 'utf8'));
  assert.throws(() => buildVestingPreparation(historicProduction));
  const oldDecimals = fixtureManifest();
  oldDecimals.tokenomics.decimals = 6;
  assert.throws(() => buildVestingPreparation(oldDecimals));
});

test('adapter source has no RPC, wallet, signing or transaction construction dependencies', () => {
  const source = fs.readFileSync('scripts/robusto-10b9-vesting-preparation.ts', 'utf8');
  assert.doesNotMatch(source, /process\.env|@solana|Keypair|Connection|fetch\s*\(|https?:\/\/|signTransaction|TransactionInstruction/);
  assert.match(source, /NOT_AUTHORIZED_FOR_MAINNET/);
  assert.match(source, /OFFLINE_FIXTURE_ONLY/);
});

test('adapter CLI emits stable JSON only and rejects runtime arguments', () => {
  const first = renderVestingPreparation([]);
  assert.equal(renderVestingPreparation([]), first);
  const parsed = JSON.parse(first);
  assert.equal(parsed.planSha256, buildVestingPreparation(fixtureManifest()).planSha256);
  assert.throws(() => renderVestingPreparation(['--cluster', 'mainnet-beta']));
});
