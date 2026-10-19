import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {buildOfflineManifest, renderOfflineManifest, U64_MAX} from '../scripts/robusto-10b9-offline';
import {CLASSIC_SPL_TOKEN_PROGRAM_ID} from '../scripts/robusto-10b9-mint-inventory';
import {buildOperationalPlan, buildPendingOperationalInput, renderOperationalPlan} from '../scripts/robusto-10b9-operational-plan';

const manifest = () => JSON.parse(renderOfflineManifest([]));
const input = () => buildPendingOperationalInput(manifest());
const plan = (value: unknown = input()) => buildOperationalPlan(manifest(), value);
const stage = (value: ReturnType<typeof plan>, id: string) => value.stages.find(s => s.id === id)!;
const review = () => ({status: 'DECLARED_REVIEWED' as const, reference: 'test-only-review-not-an-approval'});
// Existing public program IDs used only as syntax fixtures. No identity is created.
const PUBLIC_FIXTURE = '11111111111111111111111111111111';
function completeDeclaration() {
  const value = input();
  value.inventory.mintAddress = PUBLIC_FIXTURE;
  value.inventory.tokenProgramId = CLASSIC_SPL_TOKEN_PROGRAM_ID;
  value.inventory.authorities = {mint: 'NONE', freeze: 'NONE', metadataUpdate: 'NONE', vestingProgramUpgrade: PUBLIC_FIXTURE};
  for (const role of Object.keys(value.inventory.custodians) as Array<keyof typeof value.inventory.custodians>) value.inventory.custodians[role] = PUBLIC_FIXTURE;
  value.inventory.founderVestingBeneficiary = PUBLIC_FIXTURE;
  value.inventory.liquidityPositionCustodian = PUBLIC_FIXTURE;
  return value;
}

test('exact confirmed 10B/9 economics fit u64 and preserve five allocations', () => {
  const result = plan();
  assert.equal(result.confirmedEconomics.supplyTokens, '10000000000');
  assert.equal(result.confirmedEconomics.decimals, 9);
  assert.equal(result.confirmedEconomics.supplyBaseUnits, '10000000000000000000');
  assert.ok(BigInt(result.confirmedEconomics.supplyBaseUnits) <= U64_MAX);
  assert.deepEqual(result.allocationPlan.map(a => a.amountTokens), ['4000000000', '3000000000', '1500000000', '1499000000', '1000000']);
  assert.equal(result.allocationPlan.reduce((sum, a) => sum + BigInt(a.amountBaseUnits), 0n), 10n ** 19n);
  assert.equal(result.allocationPlan[4].amountBaseUnits, '1000000000000000');
});
test('rejects unchanged historical 1B/6 configuration as a manifest', () => {
  const historical = JSON.parse(readFileSync('config/robusto-production.json', 'utf8'));
  assert.throws(() => buildOperationalPlan(historical, input()));
});
test('rejects altered supply in declaration and manifest', () => {
  const value = input(); value.inventory.supplyBaseUnits = '9999999999999999999';
  assert.throws(() => plan(value), /supply differs/);
  const changed = manifest(); changed.tokenomics.supplyTokens = '10000000001';
  assert.throws(() => buildOperationalPlan(changed, input()), /Manifest differs/);
});
test('rejects decimals other than exactly nine', () => {
  for (const decimals of [6, 8, 10, '9', 9.1]) {
    const value: any = input(); value.inventory.decimals = decimals;
    assert.throws(() => plan(value), /decimals/);
  }
});
test('rejects unsafe numeric and negative quantities instead of rounding', () => {
  for (const amount of [Number.MAX_SAFE_INTEGER + 1, -1, '-1', '01', '1e19']) {
    const value: any = input(); value.inventory.allocations[0].baseUnits = amount;
    assert.throws(() => plan(value));
    value.inventory.supplyTokens = amount;
    assert.throws(() => plan(value));
  }
});
test('rejects duplicate, missing, and altered allocation entries', () => {
  const duplicate = input(); duplicate.inventory.allocations[4] = duplicate.inventory.allocations[0];
  assert.throws(() => plan(duplicate), /unique/);
  const missing = input(); missing.inventory.allocations.pop(); assert.throws(() => plan(missing));
  const founder = input(); founder.inventory.allocations[4].tokens = '1000001'; assert.throws(() => plan(founder));
});
test('missing custodians cannot pass final review', () => {
  const value = completeDeclaration(); value.inventory.custodians.community = null;
  assert.equal(stage(plan(value), 'custodians').status, 'PENDING');
  assert.throws(() => buildOperationalPlan(manifest(), value, 'FINAL_REVIEW'), /custodians.community/);
});
test('a declared but unverified mint rejects all operational preparation', () => {
  const value = completeDeclaration();
  assert.equal(stage(plan(value), 'mint_identity').status, 'BLOCKED');
  assert.throws(() => buildOperationalPlan(manifest(), value, 'OPERATIONAL_PREPARATION'), /Unverified mint/);
  assert.throws(() => buildOperationalPlan(manifest(), value, 'FINAL_REVIEW'), /Unverified mint/);
  assert.throws(() => buildOperationalPlan(manifest(), input(), 'OPERATIONAL_PREPARATION'));
});
test('unapproved founder vesting is blocked despite a beneficiary and base time', () => {
  const value = completeDeclaration(); value.founderVesting.baseUnixSeconds = '0';
  const result = plan(value);
  assert.equal(stage(result, 'founder_vesting').status, 'BLOCKED');
  assert.equal(result.founderSchedule!.authorizationGranted, false);
});
test('vesting review requires complete schedule and respects i64 limits', () => {
  const value = completeDeclaration(); value.founderVesting.approval = review();
  assert.equal(stage(plan(value), 'founder_vesting').status, 'BLOCKED');
  value.founderVesting.baseUnixSeconds = '0';
  const result = plan(value);
  assert.equal(stage(result, 'founder_vesting').status, 'READY_FOR_REVIEW');
  assert.equal(result.founderSchedule!.startUnixSeconds, '31536000');
  assert.equal(result.founderSchedule!.endUnixSeconds, '94608000');
  value.founderVesting.baseUnixSeconds = ((1n << 63n) - 1n).toString();
  assert.throws(() => plan(value), /i64/);
});
test('liquidity without external quote and fee funding is blocked', () => {
  const result = plan();
  assert.equal(stage(result, 'liquidity_prerequisites').status, 'BLOCKED');
  for (const id of ['external_quote_funding', 'external_fee_funding']) assert.equal(result.liquidityChecks.find(c => c.id === id)!.status, 'BLOCKED');
  assert.equal(result.liquidityDeposited, false);
  assert.equal(result.allocationDoesNotProveLiquidity, true);
});
test('funding references never verify mint, deposits, or Meteora safety', () => {
  const value = completeDeclaration();
  value.liquidity = {quoteAssetReference: 'test-quote-asset', quoteFunding: review(), feeFunding: review(), positionCustodyReview: review(), meteoraRiskReview: review()};
  const result = plan(value);
  assert.equal(result.liquidityChecks.find(c => c.id === 'external_quote_funding')!.status, 'READY_FOR_REVIEW');
  assert.equal(stage(result, 'liquidity_prerequisites').status, 'BLOCKED');
  assert.equal(result.meteora.findingsOpen, 10);
  assert.equal(result.chainStateVerified, false);
});
test('absent authority and declared NONE never become automatic approval', () => {
  const value = input();
  value.inventory.authorities.mint = 'NONE';
  let result = plan(value);
  assert.equal(result.authorityChecks.find(c => c.role === 'mint')!.status, 'PENDING');
  value.authorityReviews.mint = review();
  value.authorityReviews.freeze = review();
  result = plan(value);
  assert.equal(result.authorityChecks.find(c => c.role === 'mint')!.status, 'READY_FOR_REVIEW');
  assert.equal(result.authorityChecks.find(c => c.role === 'freeze')!.status, 'PENDING');
  assert.equal(result.operationsAuthorized, false);
});
test('rejects forged authorization and unknown fields recursively', () => {
  for (const [field, fake] of [['operationsAuthorized', true], ['mainnetDisabled', false], ['mainnetStatus', 'AUTHORIZED'], ['approved', true], ['status', 'READY_FOR_REVIEW']]) {
    const value: any = input(); value[String(field)] = fake; assert.throws(() => plan(value));
  }
  const chain = input(); (chain.inventory.evidence as any).rpcStateVerified = true; assert.throws(() => plan(chain));
  const nested: any = input(); nested.liquidity.transaction = {}; assert.throws(() => plan(nested));
  const approval: any = input(); approval.founderVesting.approval.status = 'APPROVED'; assert.throws(() => plan(approval));
});
test('all local review references require explicit pending/reviewed structure', () => {
  for (const bad of [{status: 'DECLARED_REVIEWED', reference: null}, {status: 'PENDING', reference: 'fake'}, {status: 'DECLARED_REVIEWED', reference: ''}, true]) {
    const value: any = input(); value.liquidity.quoteFunding = bad; assert.throws(() => plan(value));
  }
});
test('manifest hash and all immutable profile fields are checked', () => {
  const tampered = manifest(); tampered.manifestSha256 = '0'.repeat(64);
  assert.throws(() => buildOperationalPlan(tampered, input()), /Manifest differs/);
  const config = JSON.parse(readFileSync('config/robusto-tokenomics-10b9-alternative.json', 'utf8'));
  config.supplyTokens = '1000000000'; config.decimalsAssumption = 6;
  assert.throws(() => buildOfflineManifest(config));
});
test('deterministic result ignores object insertion order and does not mutate inputs', () => {
  const value = input(); const before = JSON.stringify(value);
  const first = plan(value); const reversed = Object.fromEntries(Object.entries(value).reverse());
  assert.deepEqual(plan(reversed), first);
  assert.equal(JSON.stringify(value), before);
  const {planSha256, ...payload} = first;
  function canonical(v: any): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  }
  assert.equal(planSha256, createHash('sha256').update(canonical(payload)).digest('hex'));
});
test('shared custody is visible and local review never closes global security gates', () => {
  const value = completeDeclaration(); value.custodyReview = review();
  const result = plan(value);
  assert.equal(result.custody.sharedAllocationCustody, true);
  assert.equal(stage(result, 'custodians').status, 'READY_FOR_REVIEW');
  assert.equal(stage(result, 'security_review').status, 'BLOCKED');
  assert.equal(result.nativeAtomicityVerified, false);
  assert.equal(result.independentlyAudited, false);
});
test('planner includes eight stages and never outputs executable material', () => {
  const result = plan();
  assert.equal(result.stages.length, 8);
  assert.ok(Object.values(result.outputs).every(v => v === false));
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.readyForReviewAuthorizesOperations, false);
  assert.ok(result.allocationPlan.every(a => a.custodian === null));
});
test('transitive import graph excludes SDKs, signing, networking, subprocesses and file writes', () => {
  const visited = new Set<string>();
  function inspect(path: string) {
    if (visited.has(path)) return;
    visited.add(path);
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /process\.env|\b(?:fetch|eval)\s*\(|Keypair|Connection|TransactionInstruction|sendTransaction|signTransaction|writeFile|appendFile|createWriteStream|\brequire\s*\(|\bimport\s*\(/);
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node)) continue;
      const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
      if (specifier.startsWith('.')) inspect(resolve(dirname(path), `${specifier}.ts`));
      else {
        const allowed: Record<string, string[]> = {'node:crypto': ['createHash'], 'node:fs': ['readFileSync'], 'node:path': ['join']};
        assert.ok(allowed[specifier], specifier);
        const bindings = node.importClause?.namedBindings;
        assert.ok(bindings && ts.isNamedImports(bindings), 'Only explicitly allowlisted built-in APIs');
        for (const binding of bindings.elements) assert.ok(allowed[specifier].includes((binding.propertyName ?? binding.name).text));
      }
    }
  }
  inspect(resolve('scripts/robusto-10b9-operational-plan.ts'));
  assert.equal(visited.size, 4);
});
test('fixed CLI is deterministic and rejects any runtime override', () => {
  assert.equal(renderOperationalPlan([]), renderOperationalPlan([]));
  for (const args of [['--mainnet'], ['--profile', '1B/6'], ['--output', '/tmp/plan'], ['--authorize']]) assert.throws(() => renderOperationalPlan(args));
});

test('checked-in evidence matches fixed-input CLI byte for byte', () => {
  assert.equal(readFileSync('docs/evidence/robusto/10b9-operational-plan.json', 'utf8'), renderOperationalPlan([]));
});

test('all declared authority reviews remain review-only and cannot override security', () => {
  const value = completeDeclaration();
  for (const role of Object.keys(value.authorityReviews) as Array<keyof typeof value.authorityReviews>) value.authorityReviews[role] = review();
  const result = plan(value);
  assert.equal(stage(result, 'authorities').status, 'READY_FOR_REVIEW');
  assert.equal(result.operationsAuthorized, false);
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.reviewDeclarations, value);
  assert.throws(() => buildOperationalPlan(manifest(), value, 'AUTHORIZED' as any), /Unsupported planner mode/);
});
