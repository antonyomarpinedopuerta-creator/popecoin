/** Abstract offline vesting preparation; deliberately does not build Anchor/Solana objects. */
import {createHash} from 'node:crypto';
import {
  assertOfflineManifest,
  OfflineManifest,
  renderOfflineManifest,
  U64_MAX,
} from './robusto-10b9-offline';

export const FOUNDER_AMOUNT_BASE_UNITS = 1_000_000_000_000_000n;
export const SECONDS_PER_DAY = 86_400n;
export const FOUNDER_LOCK_DAYS = 365n;
export const FOUNDER_RELEASE_DAYS = 730n;
export const I64_MAX = (1n << 63n) - 1n;

const FOUNDER_LOCK_SECONDS = FOUNDER_LOCK_DAYS * SECONDS_PER_DAY;
const FOUNDER_RELEASE_SECONDS = FOUNDER_RELEASE_DAYS * SECONDS_PER_DAY;

export interface VestingPreparation {
  schemaVersion: 1;
  status: 'OFFLINE_FIXTURE_ONLY';
  mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET';
  mainnetDisabled: true;
  profile: 'ROBUSTO_10B_9_OFFLINE';
  inputManifestSha256: string;
  vestingProgram: {
    interface: 'initialize(total_amount:u64,start_time:i64,cliff_time:i64,end_time:i64); deposit(amount:u64); release()';
    signerRoles: {
      initialize: readonly ['payer', 'authority', 'beneficiary'];
      deposit: readonly ['authority'];
      release: readonly ['beneficiary'];
    };
    authorityDecision: 'PENDING';
    instructionDataGenerated: false;
    accountsOrAddressesGenerated: false;
  };
  allocationPlan: Array<{
    label: string;
    amountTokens: string;
    amountBaseUnits: string;
    treatment: 'FOUNDER_VESTING_SCENARIO_PENDING_APPROVAL' | 'DISTRIBUTION_POLICY_PENDING';
    vestingScenario: null | {
      beneficiary: null;
      baseUnixSeconds: null;
      startOffsetSeconds: string;
      cliffOffsetSeconds: string;
      releaseDurationSeconds: string;
      endOffsetSeconds: string;
      approved: false;
    };
  }>;
  vestingAccounting: {
    founderAllocationBaseUnits: string;
    maximumFounderReleaseBaseUnits: string;
    totalAllocationBaseUnits: string;
    allocationsConserved: true;
    aboveU64: false;
    beneficiaryPending: true;
    startTimePending: true;
    activationPending: true;
    recoveryAuthority: null;
  };
  outputs: {
    instructions: false;
    transactions: false;
    signatures: false;
    privateKeys: false;
    rpcRequests: false;
  };
  planSha256: string;
}

type RecordValue = Record<string, unknown>;

function record(value: unknown, name: string): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as RecordValue;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = record(value, 'canonical value');
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function unsignedInteger(value: unknown, field: string, max = U64_MAX): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${field} must be a canonical unsigned integer string`);
  }
  const parsed = BigInt(value);
  if (parsed > max) throw new Error(`${field} exceeds its integer range`);
  return parsed;
}

/**
 * Accepts only the exact, hashed local manifest and emits an abstract plan.
 * Four non-founder buckets remain outside vesting pending separate policy decisions.
 */
export function buildVestingPreparation(input: unknown): VestingPreparation {
  const manifest: OfflineManifest = assertOfflineManifest(input);
  const founder = manifest.tokenomics.allocations.find((row) => row.label === 'founder');
  if (!founder) throw new Error('Founder allocation is missing');
  const founderBaseUnits = unsignedInteger(founder.baseUnits, 'founder amount');
  if (founder.tokens !== '1000000' || founderBaseUnits !== FOUNDER_AMOUNT_BASE_UNITS) {
    throw new Error('Founder vesting amount must be exactly 1,000,000 ROBUSTO at nine decimals');
  }

  const entries = manifest.tokenomics.allocations.map((allocation) => {
    const amountBaseUnits = unsignedInteger(allocation.baseUnits, `${allocation.label}.baseUnits`);
    if (amountBaseUnits > U64_MAX) throw new Error(`${allocation.label} exceeds u64`);
    if (allocation.label !== 'founder') {
      return {
        label: allocation.label,
        amountTokens: allocation.tokens,
        amountBaseUnits: amountBaseUnits.toString(),
        treatment: 'DISTRIBUTION_POLICY_PENDING' as const,
        vestingScenario: null,
      };
    }
    return {
      label: allocation.label,
      amountTokens: allocation.tokens,
      amountBaseUnits: amountBaseUnits.toString(),
      treatment: 'FOUNDER_VESTING_SCENARIO_PENDING_APPROVAL' as const,
      vestingScenario: {
        beneficiary: null,
        baseUnixSeconds: null,
        startOffsetSeconds: FOUNDER_LOCK_SECONDS.toString(),
        cliffOffsetSeconds: FOUNDER_LOCK_SECONDS.toString(),
        releaseDurationSeconds: FOUNDER_RELEASE_SECONDS.toString(),
        endOffsetSeconds: (FOUNDER_LOCK_SECONDS + FOUNDER_RELEASE_SECONDS).toString(),
        approved: false as const,
      },
    };
  });
  const totalBaseUnits = entries.reduce((sum, allocation) => sum + BigInt(allocation.amountBaseUnits), 0n);
  const manifestSupply = unsignedInteger(manifest.tokenomics.supplyBaseUnits, 'supply base units');
  if (totalBaseUnits !== manifestSupply || totalBaseUnits !== 10n ** 19n || totalBaseUnits > U64_MAX) {
    throw new Error('Vesting preparation must conserve the exact 10B/9 supply within u64');
  }

  const payload = {
    schemaVersion: 1 as const,
    status: 'OFFLINE_FIXTURE_ONLY' as const,
    mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET' as const,
    mainnetDisabled: true as const,
    profile: 'ROBUSTO_10B_9_OFFLINE' as const,
    inputManifestSha256: manifest.manifestSha256,
    vestingProgram: {
      interface: 'initialize(total_amount:u64,start_time:i64,cliff_time:i64,end_time:i64); deposit(amount:u64); release()' as const,
      signerRoles: {
        initialize: ['payer', 'authority', 'beneficiary'] as const,
        deposit: ['authority'] as const,
        release: ['beneficiary'] as const,
      },
      authorityDecision: 'PENDING' as const,
      instructionDataGenerated: false as const,
      accountsOrAddressesGenerated: false as const,
    },
    allocationPlan: entries,
    vestingAccounting: {
      founderAllocationBaseUnits: founderBaseUnits.toString(),
      maximumFounderReleaseBaseUnits: founderBaseUnits.toString(),
      totalAllocationBaseUnits: totalBaseUnits.toString(),
      allocationsConserved: true as const,
      aboveU64: false as const,
      beneficiaryPending: true as const,
      startTimePending: true as const,
      activationPending: true as const,
      recoveryAuthority: null,
    },
    outputs: {
      instructions: false as const,
      transactions: false as const,
      signatures: false as const,
      privateKeys: false as const,
      rpcRequests: false as const,
    },
  };
  return {...payload, planSha256: sha256(payload)};
}

export interface HypotheticalFounderScheduleInput {
  activationRequested: true;
  beneficiaryReference: string;
  baseUnixSeconds: string;
  totalAmountBaseUnits: string;
  lockDays: number;
  releaseDays: number;
}

/** Validate arithmetic for an explicitly hypothetical candidate; never used by the builder. */
export function validateHypotheticalFounderSchedule(input: unknown) {
  const candidate = record(input, 'hypothetical schedule');
  const allowed = ['activationRequested', 'beneficiaryReference', 'baseUnixSeconds', 'totalAmountBaseUnits', 'lockDays', 'releaseDays'].sort();
  const actual = Object.keys(candidate).sort();
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index])) {
    throw new Error('Hypothetical schedule contains missing or unsupported fields');
  }
  if (candidate.activationRequested !== true) throw new Error('Set activationRequested only to validate a hypothetical candidate');
  if (typeof candidate.beneficiaryReference !== 'string' || candidate.beneficiaryReference.trim().length === 0) {
    throw new Error('Beneficiary reference is required to validate an activation candidate');
  }
  if (!Number.isSafeInteger(candidate.lockDays) || candidate.lockDays !== Number(FOUNDER_LOCK_DAYS)
      || !Number.isSafeInteger(candidate.releaseDays) || candidate.releaseDays !== Number(FOUNDER_RELEASE_DAYS)) {
    throw new Error('Only the pending 365/730-day scenario can be checked here');
  }
  const base = unsignedInteger(candidate.baseUnixSeconds, 'base Unix time', I64_MAX);
  const amount = unsignedInteger(candidate.totalAmountBaseUnits, 'founder total amount');
  if (amount !== FOUNDER_AMOUNT_BASE_UNITS) throw new Error('Founder amount must exactly match the assigned allocation');
  const start = base + BigInt(candidate.lockDays) * SECONDS_PER_DAY;
  const cliff = start;
  const end = start + BigInt(candidate.releaseDays) * SECONDS_PER_DAY;
  if (start > I64_MAX || cliff > I64_MAX || end > I64_MAX || start >= end || start > cliff || cliff > end) {
    throw new Error('Schedule timestamps are invalid or exceed i64');
  }
  return {
    status: 'OFFLINE_HYPOTHETICAL_ONLY' as const,
    beneficiaryReference: candidate.beneficiaryReference,
    amountBaseUnits: amount.toString(),
    startUnixSeconds: start.toString(),
    cliffUnixSeconds: cliff.toString(),
    endUnixSeconds: end.toString(),
    maximumReleaseBaseUnits: amount.toString(),
    authorizationGranted: false as const,
    instructionsGenerated: false as const,
  };
}

/** Pure accounting bound used by negative tests; it does not update program state. */
export function validateFounderReleaseAccounting(releasedValue: unknown, vestedValue: unknown) {
  const released = unsignedInteger(releasedValue, 'released amount');
  const vested = unsignedInteger(vestedValue, 'vested amount');
  if (released > FOUNDER_AMOUNT_BASE_UNITS || vested > FOUNDER_AMOUNT_BASE_UNITS) {
    throw new Error('Founder release accounting cannot exceed the assigned allocation');
  }
  if (vested < released) throw new Error('Released amount cannot exceed vested amount');
  return {
    assignedBaseUnits: FOUNDER_AMOUNT_BASE_UNITS.toString(),
    releasedBaseUnits: released.toString(),
    vestedBaseUnits: vested.toString(),
    releasableBaseUnits: (vested - released).toString(),
  };
}

/** Pure host model of the contract's exact-remaining deposit rule, not an SPL/CPI test. */
export function validateFounderDepositAccounting(vaultValue: unknown, depositValue: unknown, releasedValue: unknown) {
  const vault = unsignedInteger(vaultValue, 'vault amount');
  const deposit = unsignedInteger(depositValue, 'deposit amount');
  const released = unsignedInteger(releasedValue, 'released amount');
  if (released !== 0n) throw new Error('Deposits are forbidden after any vesting release');
  if (vault > FOUNDER_AMOUNT_BASE_UNITS) throw new Error('Vault balance exceeds the founder allocation');
  const remaining = FOUNDER_AMOUNT_BASE_UNITS - vault;
  if (remaining === 0n || deposit !== remaining) throw new Error('Deposit must equal the exact remaining allocation');
  return {
    assignedBaseUnits: FOUNDER_AMOUNT_BASE_UNITS.toString(),
    priorVaultBaseUnits: vault.toString(),
    depositBaseUnits: deposit.toString(),
    resultingVaultBaseUnits: (vault + deposit).toString(),
  };
}

/** Host accounting only: vested rights do not establish vault funding or recovery. */
export function assessFounderVaultAccounting(vaultValue: unknown, releasedValue: unknown, vestedValue: unknown) {
  const claim = validateFounderReleaseAccounting(releasedValue, vestedValue);
  const vault = unsignedInteger(vaultValue, 'vault amount');
  const remaining = FOUNDER_AMOUNT_BASE_UNITS - BigInt(claim.releasedBaseUnits);
  const releasable = BigInt(claim.releasableBaseUnits);
  return {...claim, vaultBaseUnits: vault.toString(), remainingEntitlementBaseUnits: remaining.toString(),
    fundingShortfallBaseUnits: (vault < remaining ? remaining - vault : 0n).toString(),
    excessBaseUnits: (vault > remaining ? vault - remaining : 0n).toString(),
    arithmeticCanFundCurrentClaim: releasable > 0n && vault >= releasable,
    excessOwnershipProven: false, administrativeRecoveryAvailable: false, evidenceLevel: 'HOST_ACCOUNTING_ONLY'};
}

/** Relative-time host model of vested_amount for valid founder schedules, not execution. */
export function founderVestedModel(input: unknown, nowValue: unknown): bigint {
  const schedule = record(input, 'relative schedule');
  const allowed = ['totalAmountBaseUnits', 'startOffsetSeconds', 'cliffOffsetSeconds', 'endOffsetSeconds'].sort();
  const actual = Object.keys(schedule).sort();
  if (actual.length !== allowed.length || actual.some((key, i) => key !== allowed[i])) throw Error('Unsupported relative schedule fields');
  const total = unsignedInteger(schedule.totalAmountBaseUnits, 'founder amount');
  const start = unsignedInteger(schedule.startOffsetSeconds, 'start offset', I64_MAX);
  const cliff = unsignedInteger(schedule.cliffOffsetSeconds, 'cliff offset', I64_MAX);
  const end = unsignedInteger(schedule.endOffsetSeconds, 'end offset', I64_MAX);
  const now = unsignedInteger(nowValue, 'relative time', I64_MAX);
  if (total !== FOUNDER_AMOUNT_BASE_UNITS || start >= end || start > cliff || cliff > end) throw Error('Invalid founder relative schedule');
  if (now < cliff) return 0n;
  if (now >= end) return total;
  return total * (now - start) / (end - start);
}

/** Compare proposals only. Six "months" means 730/4 days, never calendar months. */
export function compareFounderVestingScenarios(manifestInput: unknown) {
  const preparation = buildVestingPreparation(manifestInput);
  const lock = FOUNDER_LOCK_DAYS * SECONDS_PER_DAY;
  const linear = FOUNDER_RELEASE_DAYS * SECONDS_PER_DAY;
  return {
    scope: 'OFFLINE_FIXTURE_ONLY', mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET', mainnetDisabled: true,
    operationsAuthorized: false, selectedScenario: null, beneficiary: null, baseUnixSeconds: null,
    evidenceLevel: 'HOST_MATH_ONLY_NOT_SBF', inputManifestSha256: preparation.inputManifestSha256,
    intervalConvention: '6_MONTH_LABEL_EQUALS_182_5_DAYS_NOT_CALENDAR_MONTHS',
    scenarios: [
      {id: 'LOCK_365_LINEAR_730', startOffsetSeconds: lock.toString(), cliffOffsetSeconds: lock.toString(), endOffsetSeconds: (lock + linear).toString()},
      {id: 'LOCK_365_SINGLE_UNLOCK', startOffsetSeconds: '0', cliffOffsetSeconds: lock.toString(), endOffsetSeconds: lock.toString()},
    ].map(scenario => {
      const {id, ...offsets} = scenario;
      const schedule = {totalAmountBaseUnits: FOUNDER_AMOUNT_BASE_UNITS.toString(), ...offsets};
      return {id, approved: false, schedule, points: [
        {label: 'INITIAL', seconds: 0n}, {label: 'END_LOCK', seconds: lock},
        ...['6', '12', '18', '24'].map((months, i) => ({label: `${months}_MONTH_EQUIVALENT_AFTER_LOCK`, seconds: lock + linear * BigInt(i + 1) / 4n})),
      ].map(point => {
        const vested = founderVestedModel(schedule, point.seconds.toString());
        return {label: point.label, relativeSeconds: point.seconds.toString(), vestedBaseUnits: vested.toString(),
          remainingEntitlementBaseUnits: (FOUNDER_AMOUNT_BASE_UNITS - vested).toString(),
          actualReleasedBaseUnits: null};
      })};
    }),
  };
}

/** Fixed-input CLI adapter; emits only canonical abstract JSON to stdout. */
export function renderVestingPreparation(args: readonly string[] = process.argv.slice(2)): string {
  if (args.length !== 0) throw new Error('This vesting preparation adapter accepts no runtime/profile/network arguments');
  const manifest = JSON.parse(renderOfflineManifest([])) as unknown;
  return `${JSON.stringify(buildVestingPreparation(manifest), null, 2)}\n`;
}

if (require.main === module) {
  try {
    process.stdout.write(renderVestingPreparation());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Offline vesting preparation failed';
    process.stderr.write(`ROBUSTO_VESTING_PREPARATION_REJECTED: ${message}\n`);
    process.exitCode = 1;
  }
}
