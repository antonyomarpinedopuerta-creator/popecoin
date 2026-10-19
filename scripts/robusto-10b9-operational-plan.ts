/** Abstract review checklist only. Imports no chain SDK or executable builders. */
import {createHash} from 'node:crypto';
import {assertOfflineManifest, renderOfflineManifest} from './robusto-10b9-offline';
import {buildPendingMintInventory, MintInventoryDeclaration, validateMintInventory} from './robusto-10b9-mint-inventory';
import {buildVestingPreparation, validateHypotheticalFounderSchedule} from './robusto-10b9-vesting-preparation';

export type ReviewStatus = 'PENDING' | 'BLOCKED' | 'READY_FOR_REVIEW';
type Review = {status: 'PENDING' | 'DECLARED_REVIEWED'; reference: string | null};
export interface PlanningInput {
  schemaVersion: 1;
  profile: 'ROBUSTO_10B_9_OPERATIONAL_REVIEW';
  scope: 'OFFLINE_FIXTURE_ONLY';
  mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET';
  mainnetDisabled: true;
  operationsAuthorized: false;
  inventory: MintInventoryDeclaration;
  authorityReviews: Record<keyof MintInventoryDeclaration['authorities'], Review>;
  custodyReview: Review;
  founderVesting: {
    approval: Review;
    baseUnixSeconds: string | null;
    lockDays: 365;
    releaseDays: 730;
  };
  liquidity: {
    quoteAssetReference: string | null;
    quoteFunding: Review;
    feeFunding: Review;
    positionCustodyReview: Review;
    meteoraRiskReview: Review;
  };
}

type Obj = Record<string, unknown>;
function object(value: unknown): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected review object');
  return value as Obj;
}
function keys(value: unknown, expected: readonly string[]): Obj {
  const result = object(value);
  const actual = Object.keys(result).sort();
  const allowed = [...expected].sort();
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index])) throw Error('Missing or unsupported review fields');
  return result;
}
function reference(value: unknown): boolean {
  if (value === null) return false;
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:/ -]{0,199}$/.test(value) || value.trim() !== value) {
    throw Error('Review reference must be a bounded nonempty public reference');
  }
  return true;
}
function reviewed(value: unknown): boolean {
  const review = keys(value, ['status', 'reference']);
  if (review.status === 'PENDING' && review.reference === null) return false;
  if (review.status === 'DECLARED_REVIEWED' && reference(review.reference)) return true;
  throw Error('Invalid review declaration; a reference is required and is not authenticated offline');
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(object(value)[k])}`).join(',')}}`;
}
function digest(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
const pending = (): Review => ({status: 'PENDING', reference: null});

/** No identities or choices are invented. Reviews supplied later remain local declarations. */
export function buildPendingOperationalInput(manifest: unknown): PlanningInput {
  return {
    schemaVersion: 1, profile: 'ROBUSTO_10B_9_OPERATIONAL_REVIEW',
    scope: 'OFFLINE_FIXTURE_ONLY', mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET',
    mainnetDisabled: true, operationsAuthorized: false,
    inventory: buildPendingMintInventory(manifest),
    authorityReviews: {mint: pending(), freeze: pending(), metadataUpdate: pending(), vestingProgramUpgrade: pending()},
    custodyReview: pending(),
    founderVesting: {approval: pending(), baseUnixSeconds: null, lockDays: 365, releaseDays: 730},
    liquidity: {quoteAssetReference: null, quoteFunding: pending(), feeFunding: pending(),
      positionCustodyReview: pending(), meteoraRiskReview: pending()},
  };
}

/**
 * INVENTORY produces an abstract checklist, even with missing inputs. FINAL_REVIEW
 * rejects all unresolved gates. Neither mode can authenticate a mint offline;
 * operational preparation is therefore always rejected in this phase.
 */
export function buildOperationalPlan(manifestInput: unknown, input: unknown, mode: 'INVENTORY' | 'FINAL_REVIEW' | 'OPERATIONAL_PREPARATION' = 'INVENTORY') {
  if (!['INVENTORY', 'FINAL_REVIEW', 'OPERATIONAL_PREPARATION'].includes(mode)) throw Error('Unsupported planner mode');
  const manifest = assertOfflineManifest(manifestInput);
  const value = keys(input, ['schemaVersion', 'profile', 'scope', 'mainnetStatus', 'mainnetDisabled',
    'operationsAuthorized', 'inventory', 'authorityReviews', 'custodyReview', 'founderVesting', 'liquidity']);
  if (value.schemaVersion !== 1 || value.profile !== 'ROBUSTO_10B_9_OPERATIONAL_REVIEW'
      || value.scope !== 'OFFLINE_FIXTURE_ONLY' || value.mainnetStatus !== 'NOT_AUTHORIZED_FOR_MAINNET'
      || value.mainnetDisabled !== true || value.operationsAuthorized !== false) throw Error('Offline authorization/profile mismatch');
  const inventoryResult = validateMintInventory(manifest, value.inventory);
  const inventory = value.inventory as MintInventoryDeclaration;
  const authorityReviews = keys(value.authorityReviews, Object.keys(inventory.authorities));
  const authorityChecks = Object.entries(inventory.authorities).map(([role, declaration]) => {
    const hasReview = reviewed(authorityReviews[role]);
    return {role, declaration, status: (declaration !== null && hasReview ? 'READY_FOR_REVIEW' : 'PENDING') as ReviewStatus};
  });
  const custodyReviewed = reviewed(value.custodyReview);
  const custodyComplete = Object.values(inventory.custodians).every(v => v !== null)
    && inventory.founderVestingBeneficiary !== null;
  const vesting = keys(value.founderVesting, ['approval', 'baseUnixSeconds', 'lockDays', 'releaseDays']);
  const vestingApproved = reviewed(vesting.approval);
  if (vesting.lockDays !== 365 || vesting.releaseDays !== 730) throw Error('Unsupported vesting scenario');
  // Validate a supplied timestamp even when approval is still pending.
  let schedule = null;
  if (vesting.baseUnixSeconds !== null) {
    schedule = validateHypotheticalFounderSchedule({activationRequested: true,
      beneficiaryReference: inventory.founderVestingBeneficiary ?? 'PENDING_BENEFICIARY',
      baseUnixSeconds: vesting.baseUnixSeconds, totalAmountBaseUnits: '1000000000000000',
      lockDays: vesting.lockDays, releaseDays: vesting.releaseDays});
  }
  const liquidity = keys(value.liquidity, ['quoteAssetReference', 'quoteFunding', 'feeFunding', 'positionCustodyReview', 'meteoraRiskReview']);
  const quoteIdentified = reference(liquidity.quoteAssetReference);
  const quoteFunded = reviewed(liquidity.quoteFunding);
  const feesFunded = reviewed(liquidity.feeFunding);
  const positionReviewed = reviewed(liquidity.positionCustodyReview);
  const meteoraReviewed = reviewed(liquidity.meteoraRiskReview);
  const check = (id: string, ready: boolean, reason: string) => ({id, status: (ready ? 'READY_FOR_REVIEW' : 'BLOCKED') as ReviewStatus,
    reason: ready ? 'Local declaration available for independent review; not authenticated' : reason});
  const liquidityChecks = [
    check('verified_mint', false, 'Mint chain identity/state cannot be verified by this offline planner'),
    check('allocation', inventory.allocations.find(a => a.label === 'liquidity_market')?.baseUnits === '4000000000000000000', 'Incorrect liquidity allocation'),
    check('external_quote_funding', quoteIdentified && quoteFunded, 'External quote funding and quote asset remain unconfirmed'),
    check('external_fee_funding', feesFunded, 'External fee funding remains unconfirmed'),
    check('position_custody', inventory.liquidityPositionCustodian !== null && inventory.liquidityPositionCustodian !== 'NOT_CREATED' && positionReviewed, 'Position custodian and custody review required'),
    check('meteora_risk_evaluation', meteoraReviewed, 'Meteora risk evaluation reference required; findings remain open'),
  ];
  const stages: Array<{id: string; status: ReviewStatus; reasons: string[]}> = [
    {id: 'mint_identity', status: 'BLOCKED', reasons: inventoryResult.reasons.concat('No authenticated chain verification in offline declarations')},
    {id: 'supply_decimals', status: 'READY_FOR_REVIEW', reasons: ['Exact manifest arithmetic only; not observed mint supply']},
    {id: 'authorities', status: authorityChecks.every(c => c.status === 'READY_FOR_REVIEW') ? 'READY_FOR_REVIEW' : 'PENDING', reasons: authorityChecks.filter(c => c.status === 'PENDING').map(c => `${c.role}: explicit declaration and review required`)},
    {id: 'five_allocations', status: 'READY_FOR_REVIEW', reasons: ['Exact allocation accounting; no distribution or deposit performed']},
    {id: 'custodians', status: custodyComplete && custodyReviewed ? 'READY_FOR_REVIEW' : 'PENDING', reasons: custodyComplete && custodyReviewed ? [] : ['Five custodians, beneficiary and custody review required']},
    {id: 'founder_vesting', status: vestingApproved && schedule !== null && inventory.founderVestingBeneficiary !== null ? 'READY_FOR_REVIEW' : 'BLOCKED', reasons: vestingApproved && schedule !== null && inventory.founderVestingBeneficiary !== null ? [] : ['Unapproved or incomplete 365/730-day vesting; beneficiary and base time required']},
    {id: 'liquidity_prerequisites', status: 'BLOCKED', reasons: liquidityChecks.filter(c => c.status === 'BLOCKED').map(c => c.reason)},
    {id: 'security_review', status: 'BLOCKED', reasons: ['M-01 through M-10 remain open', 'NATIVE_ATOMICITY_NOT_VERIFIED', 'Independent audit, custody recovery and authorities require external acceptance']},
  ];
  const blockers = stages.filter(s => s.status !== 'READY_FOR_REVIEW');
  if (mode !== 'INVENTORY') {
    // Includes stronger syntax/completeness validation, without accepting its result as verification.
    validateMintInventory(manifest, inventory, {requireFinal: true});
    throw Error(`Unverified mint forbids ${mode}; unresolved stages: ${blockers.map(s => s.id).join(', ')}`);
  }
  const payload = {
    schemaVersion: 1, profile: value.profile, status: 'BLOCKED' as ReviewStatus,
    scope: 'OFFLINE_FIXTURE_ONLY', mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET',
    mainnetDisabled: true, operationsAuthorized: false, readyForReviewAuthorizesOperations: false,
    evidenceLevel: 'LOCAL_DECLARATIONS_NOT_AUTHENTICATED', chainStateVerified: false,
    independentlyAudited: false, nativeAtomicityVerified: false,
    confirmedEconomics: {name: 'ROBUSTO', decimals: 9, supplyTokens: manifest.tokenomics.supplyTokens,
      supplyBaseUnits: manifest.tokenomics.supplyBaseUnits, u64Headroom: manifest.tokenomics.u64Headroom},
    inputManifestSha256: manifest.manifestSha256, inputSha256: digest(input),
    reviewDeclarations: JSON.parse(canonical(input)) as PlanningInput,
    stages, unresolvedStages: blockers.map(s => s.id), authorityChecks,
    allocationPlan: buildVestingPreparation(manifest).allocationPlan.map(a => ({...a, custodian: inventory.custodians[a.label as keyof typeof inventory.custodians]})),
    custody: {declarations: inventory.custodians, beneficiary: inventory.founderVestingBeneficiary,
      liquidityPosition: inventory.liquidityPositionCustodian,
      sharedAllocationCustody: new Set(Object.values(inventory.custodians).filter(v => v !== null)).size < Object.values(inventory.custodians).filter(v => v !== null).length,
      risks: ['Beneficiary loss has no administrative recovery', 'Direct vault donations can remain locked', 'Shared custody concentrates control; public syntax does not prove control or recovery']},
    founderSchedule: schedule, liquidityChecks,
    liquidityDeposited: false, allocationDoesNotProveLiquidity: true,
    meteora: {protocol: 'DAMM_V2', findingsOpen: 10, status: 'BLOCKED_FOR_PRODUCTION_REVIEW'},
    outputs: {instructions: false, transactions: false, signatures: false, accounts: false, privateKeys: false, rpcRequests: false},
  };
  return {...payload, planSha256: digest(payload)};
}

/** Fixed null-filled input; stdout only. No runtime overrides or operational CLI. */
export function renderOperationalPlan(args: readonly string[] = process.argv.slice(2)): string {
  if (args.length) throw Error('Offline planner accepts no runtime arguments');
  const manifest: unknown = JSON.parse(renderOfflineManifest([]));
  return `${JSON.stringify(buildOperationalPlan(manifest, buildPendingOperationalInput(manifest)), null, 2)}\n`;
}
if (require.main === module) {
  try { process.stdout.write(renderOperationalPlan()); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : 'Offline plan rejected'}\n`); process.exitCode = 1; }
}
