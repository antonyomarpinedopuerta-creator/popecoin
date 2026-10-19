import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderOfflineManifest} from '../scripts/robusto-10b9-offline';
import {buildPendingMintInventory, CLASSIC_SPL_TOKEN_PROGRAM_ID} from '../scripts/robusto-10b9-mint-inventory';
import {compareFounderVestingScenarios, founderVestedModel, FOUNDER_AMOUNT_BASE_UNITS as TOTAL,
  validateFounderDepositAccounting, validateFounderReleaseAccounting} from '../scripts/robusto-10b9-vesting-preparation';
import {CustodyPolicy, ROLE_PERMISSIONS, signerCompatibility, validateCustodyControls} from '../scripts/robusto-custody-controls';

const manifest = () => JSON.parse(renderOfflineManifest([]));
const inventory = () => buildPendingMintInventory(manifest());
const policy = (): CustodyPolicy => ({scope: 'OFFLINE_FIXTURE_ONLY', mainnetDisabled: true, operationsAuthorized: false,
  administrativeRecovery: false, beneficiaryReplacement: false, excessSweep: false,
  roles: (Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>).map(role => ({role, mechanism: 'PENDING', controllerGroup: null, requestedPermissions: []}))});
function check(p = policy(), inv = inventory(), complete = false) { return validateCustodyControls(manifest(), inv, p, complete); }
const proposal = () => compareFounderVestingScenarios(manifest());

test('eleven explicit roles preserve five exact allocations without selecting identities', () => {
  const result = check();
  assert.equal(result.roles.length, 11);
  assert.ok(result.roles.every(r => r.declaration === null && r.unresolved));
  assert.equal(result.allocationsValidated.reduce((n, a) => n + BigInt(a.amountBaseUnits), 0n), 10n ** 19n);
  assert.equal(result.readyForImplementation, false);
});
test('SPL multisig is not an Anchor Signer for initialize, deposit or release', () => {
  assert.equal(signerCompatibility('SPL_MULTISIG', 'ANCHOR_SIGNER'), 'INCOMPATIBLE');
  for (const role of ['founderVestingBeneficiary', 'metadataUpdate', 'vestingProgramUpgrade', 'liquidityPositionCustodian']) {
    const p = policy(); p.roles.find(r => r.role === role)!.mechanism = 'SPL_MULTISIG';
    assert.throws(() => check(p), /does not satisfy required single-account signer/);
  }
  assert.equal(signerCompatibility('SPL_MULTISIG', 'CLASSIC_SPL_TOKEN'), 'DECLARED_COMPATIBLE_NOT_VERIFIED');
});
test('program multisig PDA and Meteora position always require external compatibility evidence', () => {
  assert.equal(signerCompatibility('PROGRAM_MULTISIG_PDA', 'ANCHOR_SIGNER'), 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF');
  assert.equal(signerCompatibility('SINGLE_SIGNER', 'EXTERNAL_POSITION'), 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF');
  const p = policy(); p.roles[0].mechanism = 'PROGRAM_MULTISIG_PDA';
  assert.equal(check(p).roles.find(r => r.role === p.roles[0].role)!.unresolved, true);
});
test('rejects mint, freeze, upgrade and recovery permissions on a beneficiary', () => {
  for (const permission of ['mint_tokens', 'freeze_token_accounts', 'replace_program_code', 'rescue_vesting', 'replace_beneficiary', 'sweep_excess']) {
    const p = policy(); p.roles.find(r => r.role === 'founderVestingBeneficiary')!.requestedPermissions = [permission];
    assert.throws(() => check(p), /Incompatible permissions/);
  }
});
test('rejects authority access to vesting principal or other allocations', () => {
  for (const role of ['mint', 'freeze', 'metadataUpdate', 'vestingProgramUpgrade', 'community']) {
    const p = policy(); p.roles.find(r => r.role === role)!.requestedPermissions = ['release_vested_to_self'];
    assert.throws(() => check(p), /Incompatible permissions/);
  }
});
test('absent authority cannot retain permissions or imply automatic readiness', () => {
  const inv = inventory(); inv.authorities.mint = 'NONE';
  const p = policy(); const role = p.roles.find(r => r.role === 'mint')!; role.mechanism = 'NONE';
  assert.equal(check(p, inv).readyForImplementation, false);
  role.requestedPermissions = ['mint_tokens']; assert.throws(() => check(p, inv), /Absent authority/);
  role.requestedPermissions = []; role.controllerGroup = 'admin'; assert.throws(() => check(p, inv), /Absent authority/);
});
test('detects abstract controller concentration even if addresses are missing', () => {
  const p = policy();
  p.roles.find(r => r.role === 'vestingProgramUpgrade')!.controllerGroup = 'same_operator';
  p.roles.find(r => r.role === 'community')!.controllerGroup = 'same_operator';
  assert.equal(check(p).concentration.length, 1);
  assert.equal(check(p).concentration[0].sameControllerGroup, true);
});
test('different group labels cannot hide reuse of a public identity', () => {
  const inv = inventory();
  // Existing public system-program identifier: syntax fixture, not a selected owner.
  inv.authorities.metadataUpdate = '11111111111111111111111111111111';
  inv.founderVestingBeneficiary = inv.authorities.metadataUpdate;
  const p = policy(); p.roles.forEach((r, i) => { r.controllerGroup = `distinct_${i}`; });
  const result = check(p, inv);
  assert.equal(result.concentration.length, 1);
  assert.equal(result.concentration[0].sameIdentity, true);
  assert.equal(result.concentration[0].sameControllerGroup, false);
});
test('rejects missing or malformed beneficiary in a complete declaration, never claims existence', () => {
  const inv = inventory(); inv.mintAddress = '11111111111111111111111111111111'; inv.tokenProgramId = CLASSIC_SPL_TOKEN_PROGRAM_ID;
  inv.authorities = {mint: 'NONE', freeze: 'NONE', metadataUpdate: 'NONE', vestingProgramUpgrade: 'NONE'};
  for (const role of Object.keys(inv.custodians) as Array<keyof typeof inv.custodians>) inv.custodians[role] = inv.mintAddress;
  inv.liquidityPositionCustodian = inv.mintAddress;
  assert.throws(() => check(policy(), inv, true), /founderVestingBeneficiary/);
  const malformed = inventory(); malformed.founderVestingBeneficiary = 'nonexistent'; assert.throws(() => check(policy(), malformed));
  assert.equal(check().identityExistenceVerified, false);
});
test('rejects forged recovery, authorization and extra capabilities', () => {
  for (const field of ['administrativeRecovery', 'beneficiaryReplacement', 'excessSweep', 'operationsAuthorized']) {
    const p: any = policy(); p[field] = true; assert.throws(() => check(p));
  }
  const p: any = policy(); p.recoveryAuthority = 'admin'; assert.throws(() => check(p));
});
test('rejects duplicate roles, duplicate permissions, unknown mechanisms and unknown consumers', () => {
  const duplicate = policy(); duplicate.roles[10] = duplicate.roles[0]; assert.throws(() => check(duplicate), /duplicate/);
  const p = policy(); p.roles[0].requestedPermissions = ['mint_tokens', 'mint_tokens']; assert.throws(() => check(p));
  assert.throws(() => signerCompatibility('MAGIC' as any, 'ANCHOR_SIGNER'));
  assert.throws(() => signerCompatibility('SINGLE_SIGNER', 'MAGIC' as any));
});
test('rejects allocation alterations and the historical profile before policy evaluation', () => {
  const inv = inventory(); inv.allocations[4].tokens = '1000001'; assert.throws(() => check(policy(), inv));
  assert.throws(() => validateCustodyControls(JSON.parse(readFileSync('config/robusto-production.json', 'utf8')), inventory(), policy()));
});
test('custody evaluation is deterministic, does not mutate inputs or authorize implementation', () => {
  const inv = inventory(), p = policy(); const before = JSON.stringify([inv, p]);
  const first = check(p, inv); p.roles.reverse();
  assert.deepEqual(check(p, inv), first); p.roles.reverse();
  assert.equal(JSON.stringify([inv, p]), before);
  assert.equal(first.operationsAuthorized, false);
});
test('linear proposal locks one million initially and vests exact quarters after the lock', () => {
  const scenario = proposal().scenarios[0];
  assert.deepEqual(scenario.points.map(p => p.vestedBaseUnits), ['0', '0', '250000000000000', '500000000000000', '750000000000000', TOTAL.toString()]);
  assert.ok(scenario.points.every(p => BigInt(p.vestedBaseUnits) + BigInt(p.remainingEntitlementBaseUnits) === TOTAL && p.actualReleasedBaseUnits === null));
});
test('single-unlock alternative is supported by cliff=end and releases entitlement at day 365', () => {
  const scenario = proposal().scenarios[1];
  assert.deepEqual(scenario.points.map(p => p.vestedBaseUnits), ['0', ...Array(5).fill(TOTAL.toString())]);
  assert.equal(founderVestedModel(scenario.schedule, (365n * 86400n - 1n).toString()), 0n);
  assert.equal(scenario.schedule.cliffOffsetSeconds, scenario.schedule.endOffsetSeconds);
});
test('vesting comparisons do not choose a beneficiary, base date or approved scenario', () => {
  const result = proposal(); assert.equal(result.selectedScenario, null); assert.equal(result.beneficiary, null);
  assert.equal(result.baseUnixSeconds, null); assert.ok(result.scenarios.every(s => s.approved === false));
  assert.equal(result.scenarios[0].points[2].relativeSeconds, (365n * 86400n + 15768000n).toString());
});
test('model rejects invalid calendars, negatives, unsafe numbers and founder amounts', () => {
  const schedule = proposal().scenarios[0].schedule;
  for (const changed of [
    {...schedule, startOffsetSeconds: schedule.endOffsetSeconds}, {...schedule, cliffOffsetSeconds: '0'},
    {...schedule, endOffsetSeconds: '1'}, {...schedule, startOffsetSeconds: '-1'},
    {...schedule, endOffsetSeconds: (1n << 63n).toString()}, {...schedule, totalAmountBaseUnits: '1'},
    {...schedule, totalAmountBaseUnits: Number.MAX_SAFE_INTEGER + 1},
  ]) assert.throws(() => founderVestedModel(changed, '0'));
  for (const now of ['-1', '1.5', 1, (1n << 63n).toString()]) assert.throws(() => founderVestedModel(schedule, now));
});
test('one-second floor, boundaries and monotonicity match mathematical contract semantics', () => {
  const schedule = proposal().scenarios[0].schedule;
  const start = BigInt(schedule.startOffsetSeconds), end = BigInt(schedule.endOffsetSeconds);
  assert.equal(founderVestedModel(schedule, (start + 1n).toString()), TOTAL / (730n * 86400n));
  let previous = 0n;
  for (let day = 0n; day <= 1100n; day++) {
    const vested = founderVestedModel(schedule, (day * 86400n).toString());
    assert.ok(vested >= previous && vested <= TOTAL); previous = vested;
  }
  assert.equal(founderVestedModel(schedule, end.toString()), TOTAL);
});
test('existing accounting rejects surplus, partial deposits, post-release deposits and overclaims', () => {
  assert.throws(() => validateFounderDepositAccounting((TOTAL + 1n).toString(), '1', '0'));
  assert.throws(() => validateFounderDepositAccounting('0', (TOTAL - 1n).toString(), '0'));
  assert.throws(() => validateFounderDepositAccounting('0', TOTAL.toString(), '1'));
  assert.throws(() => validateFounderReleaseAccounting('0', (TOTAL + 1n).toString()));
});
test('source evidence preserves Anchor signer requirements, beneficiary owner checks and PDA scope', () => {
  const init = readFileSync('programs/popecoin_vesting/src/instructions/initialize.rs', 'utf8');
  const deposit = readFileSync('programs/popecoin_vesting/src/instructions/deposit.rs', 'utf8');
  const release = readFileSync('programs/popecoin_vesting/src/instructions/release.rs', 'utf8');
  for (const role of ['payer', 'authority', 'beneficiary']) assert.ok(init.includes(`pub ${role}: Signer<'info>`));
  assert.ok(deposit.includes("pub authority: Signer<'info>"));
  assert.ok(release.includes("pub beneficiary: Signer<'info>"));
  assert.ok(release.includes('beneficiary_token_account.owner == beneficiary.key()'));
  assert.ok(init.includes('beneficiary.key().as_ref()') && init.includes('mint.key().as_ref()'));
  assert.doesNotMatch(init + deposit + release, /multisig::|validate_owner/);
});
test('new custody validator imports only existing abstract validators and cannot access network or signing APIs', () => {
  const source = readFileSync('scripts/robusto-custody-controls.ts', 'utf8');
  assert.doesNotMatch(source, /@solana|Keypair|Connection|fetch\s*\(|process\.env|Transaction|writeFile|child_process|\brequire\s*\(/);
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual(imports, ['./robusto-10b9-mint-inventory', './robusto-10b9-vesting-preparation']);
});

test('checked-in mathematical comparison is reproducible byte for byte', () => {
  assert.equal(readFileSync('docs/evidence/robusto/founder-vesting-comparison.json', 'utf8'), `${JSON.stringify(proposal(), null, 2)}\n`);
});

test('complete public declarations cannot bypass concentration and unproved position compatibility', () => {
  const inv = inventory(); const id = '11111111111111111111111111111111';
  inv.mintAddress = id; inv.tokenProgramId = CLASSIC_SPL_TOKEN_PROGRAM_ID;
  inv.authorities = {mint: 'NONE', freeze: 'NONE', metadataUpdate: 'NONE', vestingProgramUpgrade: 'NONE'};
  for (const role of Object.keys(inv.custodians) as Array<keyof typeof inv.custodians>) inv.custodians[role] = id;
  inv.founderVestingBeneficiary = id; inv.liquidityPositionCustodian = id;
  const p = policy(); p.roles.forEach(r => {
    if (r.role in inv.authorities) r.mechanism = 'NONE';
    else { r.mechanism = 'SINGLE_SIGNER'; r.controllerGroup = r.role; }
  });
  assert.throws(() => check(p, inv, true), /concentration/);
});
