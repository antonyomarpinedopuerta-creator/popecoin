import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {technicalCustodyMatrix, signerCompatibility, Mechanism, ROLE_PERMISSIONS, CustodyPolicy, validateCustodyControls} from '../scripts/robusto-custody-controls';
import {renderOfflineManifest, U64_MAX} from '../scripts/robusto-10b9-offline';
import {buildPendingMintInventory} from '../scripts/robusto-10b9-mint-inventory';
import {assessFounderVaultAccounting, validateFounderDepositAccounting, validateHypotheticalFounderSchedule,
  founderVestedModel, I64_MAX, FOUNDER_AMOUNT_BASE_UNITS as TOTAL} from '../scripts/robusto-10b9-vesting-preparation';
import {founderParityVectors} from './founder-vesting-parity-vectors';

const manifest = () => JSON.parse(renderOfflineManifest([]));
function policy(): CustodyPolicy {
  return {scope: 'OFFLINE_FIXTURE_ONLY', mainnetDisabled: true, operationsAuthorized: false,
    administrativeRecovery: false, beneficiaryReplacement: false, excessSweep: false,
    roles: (Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>).map(role => ({role, controllerGroup: null, mechanism: 'PENDING', requestedPermissions: []}))};
}
function controls(value: unknown) { return validateCustodyControls(manifest(), buildPendingMintInventory(manifest()), value); }
const schedule = {totalAmountBaseUnits: TOTAL.toString(), startOffsetSeconds: '31536000', cliffOffsetSeconds: '31536000', endOffsetSeconds: '94608000'};

test('24 matrix cells distinguish source requirements from end-to-end compatibility', () => {
  const matrix = technicalCustodyMatrix(); assert.equal(matrix.rows.length, 24);
  assert.ok(matrix.rows.every(row => row.compatibility === 'DEMONSTRATED_INCOMPATIBLE_DIRECT_PATH' || row.compatibility === 'PENDING_EXECUTION_PROOF'));
  assert.ok(matrix.rows.every(row => !row.productionApproved && !row.realSignaturesVerified));
  assert.equal(matrix.operationsAuthorized, false);
});
test('SPL token member-signature interface is not promoted to a demonstrated runtime path', () => {
  const rows = technicalCustodyMatrix().rows.filter(r => r.consumer === 'CLASSIC_SPL_TOKEN' && r.mechanism === 'SPL_MULTISIG');
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.interfaceEvidence === 'SIGNER_FORM_SUPPORTED_BY_SOURCE' && r.compatibility === 'PENDING_EXECUTION_PROOF'));
});
test('loader authority and metadata are no longer mislabelled as Anchor account consumers', () => {
  const result = controls(policy());
  assert.equal(result.roles.find(r => r.role === 'vestingProgramUpgrade')!.consumer, 'LOADER_AUTHORITY');
  assert.equal(result.roles.find(r => r.role === 'metadataUpdate')!.consumer, 'METADATA_AUTHORITY');
  assert.equal(signerCompatibility('SINGLE_SIGNER', 'METADATA_AUTHORITY'), 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF');
});
test('managed accounts are never assumed to be PDAs or self-signing accounts', () => {
  for (const consumer of ['ANCHOR_SIGNER', 'CLASSIC_SPL_TOKEN', 'LOADER_AUTHORITY', 'EXTERNAL_POSITION', 'METADATA_AUTHORITY'] as const) {
    assert.equal(signerCompatibility('MULTISIG_MANAGED_ACCOUNT', consumer), 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF');
  }
  const p = policy(); p.roles.forEach(r => {r.mechanism = 'MULTISIG_MANAGED_ACCOUNT'; r.controllerGroup = r.role;});
  assert.ok(controls(p).roles.every(r => r.unresolved));
});
test('governance PDA cannot acquire compatibility by specifying a control group', () => {
  const p = policy(); p.roles.forEach(r => {r.mechanism = 'PROGRAM_MULTISIG_PDA'; r.controllerGroup = r.role;});
  assert.ok(controls(p).roles.every(r => r.unresolved && r.compatibility === 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF'));
});
test('native SPL multisig token custody is distinct from vesting deposit authority', () => {
  assert.equal(signerCompatibility('SPL_MULTISIG', 'CLASSIC_SPL_TOKEN'), 'DECLARED_COMPATIBLE_NOT_VERIFIED');
  const deposit = technicalCustodyMatrix().rows.find(r => r.boundary === 'vesting_deposit_authority' && r.mechanism === 'SPL_MULTISIG')!;
  assert.equal(deposit.compatibility, 'DEMONSTRATED_INCOMPATIBLE_DIRECT_PATH');
  assert.equal(signerCompatibility('SPL_MULTISIG', 'LOADER_AUTHORITY'), 'INCOMPATIBLE');
});
test('claims of verified custody, recovery, immutable program or upgraded safety are rejected', () => {
  for (const field of ['chainStateVerified', 'recoveryProven', 'programImmutable', 'upgradeSafe', 'compatible']) {
    const p: any = policy(); p[field] = true; assert.throws(() => controls(p), /Unsupported custody fields/);
  }
  const p: any = policy(); p.roles[0].cpiSignerVerified = true; assert.throws(() => controls(p));
});
test('a fully vested right remains unfunded if the vault has one base unit too little', () => {
  const value = assessFounderVaultAccounting((TOTAL - 1n).toString(), '0', TOTAL.toString());
  assert.equal(value.fundingShortfallBaseUnits, '1');
  assert.equal(value.arithmeticCanFundCurrentClaim, false);
});
test('excess is measured against unreleased entitlement after a partial release', () => {
  const released = TOTAL / 4n;
  const result = assessFounderVaultAccounting((TOTAL - released + 1n).toString(), released.toString(), (TOTAL / 2n).toString());
  assert.equal(result.excessBaseUnits, '1');
  assert.equal(result.administrativeRecoveryAvailable, false);
  assert.equal(result.excessOwnershipProven, false);
  assert.equal(result.releasableBaseUnits, (TOTAL / 4n).toString());
});
test('after final release, the entire donated remainder is excess without a recovery right', () => {
  const result = assessFounderVaultAccounting('1', TOTAL.toString(), TOTAL.toString());
  assert.equal(result.excessBaseUnits, '1');
  assert.equal(result.remainingEntitlementBaseUnits, '0');
  assert.equal(result.arithmeticCanFundCurrentClaim, false);
  assert.equal(result.administrativeRecoveryAvailable, false);
});
test('direct top-ups can restore arithmetic funding after release while deposit remains forbidden', () => {
  const released = TOTAL / 2n;
  assert.equal(assessFounderVaultAccounting('0', released.toString(), TOTAL.toString()).arithmeticCanFundCurrentClaim, false);
  assert.equal(assessFounderVaultAccounting(released.toString(), released.toString(), TOTAL.toString()).arithmeticCanFundCurrentClaim, true);
  assert.throws(() => validateFounderDepositAccounting('0', released.toString(), released.toString()), /after any/);
});
test('clock regression below released amount rejects subtraction rather than wrapping', () => {
  const previouslyReleased = founderVestedModel(schedule, '63072000');
  const regressed = founderVestedModel(schedule, '31536001');
  assert.ok(regressed < previouslyReleased);
  assert.throws(() => assessFounderVaultAccounting(TOTAL.toString(), previouslyReleased.toString(), regressed.toString()), /Released amount/);
});
test('maximum valid u64 vault is supported without inflating founder entitlement', () => {
  const result = assessFounderVaultAccounting(U64_MAX.toString(), '0', TOTAL.toString());
  assert.equal(result.excessBaseUnits, (U64_MAX - TOTAL).toString());
  assert.equal(result.assignedBaseUnits, TOTAL.toString());
  for (const bad of [(U64_MAX + 1n).toString(), '-1', Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => assessFounderVaultAccounting(bad, '0', '0'));
});
test('latest nonnegative base time fits i64 exactly; one second later overflows', () => {
  const input = {activationRequested: true, beneficiaryReference: 'HYPOTHETICAL_ONLY', baseUnixSeconds: (I64_MAX - 94608000n).toString(),
    totalAmountBaseUnits: TOTAL.toString(), lockDays: 365, releaseDays: 730};
  assert.equal(validateHypotheticalFounderSchedule(input).endUnixSeconds, I64_MAX.toString());
  assert.throws(() => validateHypotheticalFounderSchedule({...input, baseUnixSeconds: (I64_MAX - 94608000n + 1n).toString()}), /i64/);
  for (const bad of ['2026-02-30T00:00:00Z', 'NaN', 'Infinity', '-1']) assert.throws(() => validateHypotheticalFounderSchedule({...input, baseUnixSeconds: bad}));
});
test('wrong start=0 causes cliff catch-up and is distinguishable from the provisional schedule', () => {
  assert.equal(founderVestedModel(schedule, '31536000'), 0n);
  assert.equal(founderVestedModel({...schedule, startOffsetSeconds: '0'}, '31536000'), TOTAL / 3n);
});
test('30 parity vectors include i64 extremes, last-second dust and invariant origin shifts', () => {
  const vectors = founderParityVectors(); assert.equal(vectors.length, 30);
  assert.equal(vectors[0].now, (-(1n << 63n)).toString());
  assert.equal(vectors[29].now, I64_MAX.toString());
  assert.deepEqual(vectors.slice(0, 10).map(v => v.expected), vectors.slice(20).map(v => v.expected));
  assert.equal(BigInt(vectors[7].expected), TOTAL - (TOTAL + 63072000n - 1n) / 63072000n);
});
test('compatibility matrix fixture is deterministic and source-level only', () => {
  assert.equal(readFileSync('docs/evidence/robusto/custody-technical-compatibility.json', 'utf8'), `${JSON.stringify(technicalCustodyMatrix(), null, 2)}\n`);
});
