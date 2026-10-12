/**
 * Pure local ROBUSTO 10B/9 preparation manifest builder.
 * Uses Node built-ins only. It does not construct Solana instructions/transactions,
 * load a wallet, read environment variables, sign, connect, or send anything.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export const PROFILE = 'ROBUSTO_10B_9_OFFLINE';
export const DECIMALS = 9;
export const SCALE = 10n ** BigInt(DECIMALS);
export const SUPPLY_TOKENS = 10_000_000_000n;
export const SUPPLY_BASE_UNITS = SUPPLY_TOKENS * SCALE;
export const U64_MAX = (1n << 64n) - 1n;

const EXPECTED_ALLOCATIONS = [
  {label: 'liquidity_market', tokens: '4000000000', basisPoints: 4000},
  {label: 'community', tokens: '3000000000', basisPoints: 3000},
  {label: 'strategic_reserve', tokens: '1500000000', basisPoints: 1500},
  {label: 'development_operations', tokens: '1499000000', basisPoints: 1499},
  {label: 'founder', tokens: '1000000', basisPoints: 1},
] as const;

const CONFIG_KEYS = [
  'status', 'scope', 'mainnetStatus', 'mainnetDisabled', 'operationsAuthorized',
  'decimalsAssumption', 'supplyTokens', 'supplyBaseUnits', 'fixedSupplyProposed',
  'additionalIssuanceProposed', 'founderPersonalFunding', 'allocations',
  'founderVesting', 'initialCirculationTokens', 'otherBucketSchedules', 'price',
  'quoteLiquidity', 'note',
].sort();
const VESTING_KEYS = [
  'requestedLockMonths', 'requestedLinearMonths', 'model', 'lockDaysAssumption',
  'linearDaysAssumption', 'accrualDuringLock', 'beneficiary', 'baseUtc',
].sort();
const CONFIG_NOTE = 'Separate 10B/9-decimal offline alternative. No production adoption, identities, signatures, funds or chain operations. 365/730 days are test assumptions.';

type UnknownRecord = Record<string, unknown>;

export interface OfflineAllocation {
  label: string;
  tokens: string;
  baseUnits: string;
  basisPoints: string;
}

export interface OfflineManifest {
  schemaVersion: 1;
  profile: typeof PROFILE;
  project: {name: 'ROBUSTO'; symbol: 'ROBUSTO'};
  mode: {
    status: 'OFFLINE_FIXTURE_ONLY';
    mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET';
    mainnetDisabled: true;
    operationsAuthorized: false;
    productionAdoption: false;
  };
  tokenomics: {
    decimals: 9;
    decimalsStatus: 'OWNER_SELECTED_NOT_APPLIED_TO_PRODUCTION';
    supplyTokens: string;
    supplyBaseUnits: string;
    u64Max: string;
    u64Headroom: string;
    allocationSumBaseUnits: string;
    allocations: OfflineAllocation[];
  };
  decisionsPending: {
    addresses: null;
    authorities: {
      mint: null;
      freeze: null;
      metadataUpdate: null;
      programUpgrade: null;
    };
    beneficiaries: null;
    founderVesting: {
      beneficiary: null;
      baseUtc: null;
      lockDaysScenario: 365;
      linearReleaseDaysScenario: 730;
      approved: false;
    };
    initialCirculationTokens: null;
    marketPair: null;
    price: null;
    quoteLiquidity: null;
  };
  outputs: {
    solanaInstructions: false;
    transactions: false;
    signatures: false;
    privateKeys: false;
    rpcRequests: false;
  };
  source: {config: 'config/robusto-tokenomics-10b9-alternative.json'; constructor: typeof PROFILE};
  manifestSha256: string;
}

function record(value: unknown, name: string): UnknownRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, keys: readonly string[], name: string): void {
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, i) => key !== keys[i])) {
    throw new Error(`${name} contains missing or unsupported fields`);
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = record(value, 'canonical value');
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(',')}}`;
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

/** Exact decimal token conversion for validation and boundary tests; never uses Number. */
export function decimalTokensToBaseUnits(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 40
      || !/^(0|[1-9][0-9]*)(\.[0-9]{1,9})?$/.test(value)) {
    throw new Error('Token amount must be a canonical decimal string with at most nine places');
  }
  const [whole, fraction = ''] = value.split('.');
  const baseUnits = BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, '0'));
  if (baseUnits > U64_MAX) throw new Error('Token amount exceeds u64');
  return baseUnits;
}

/** Parse whole-token decimal strings without Number conversions or rounding. */
export function wholeTokensToBaseUnits(value: unknown, name = 'tokens'): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name} must be a canonical non-negative whole-token string`);
  }
  return decimalTokensToBaseUnits(value);
}

/** Validate the exact isolated fixture and return canonical allocations. */
export function validateOfflineConfig(input: unknown): OfflineAllocation[] {
  const config = record(input, 'config');
  exactKeys(config, CONFIG_KEYS, 'config');

  if (config.status !== 'PROPOSED_NOT_APPROVED'
      || config.scope !== 'OFFLINE_FIXTURE_ONLY'
      || config.mainnetStatus !== 'NOT_AUTHORIZED_FOR_MAINNET'
      || config.mainnetDisabled !== true
      || config.operationsAuthorized !== false) {
    throw new Error('Only the explicitly disabled offline fixture is accepted');
  }
  if (config.note !== CONFIG_NOTE) throw new Error('Offline fixture note does not match the reviewed profile');
  if (config.decimalsAssumption !== DECIMALS
      || config.supplyTokens !== SUPPLY_TOKENS.toString()
      || config.supplyBaseUnits !== SUPPLY_BASE_UNITS.toString()
      || config.fixedSupplyProposed !== true
      || config.additionalIssuanceProposed !== false
      || config.founderPersonalFunding !== '0') {
    throw new Error('10B/9 owner-selected profile mismatch');
  }
  if (wholeTokensToBaseUnits(config.supplyTokens, 'supplyTokens') !== SUPPLY_BASE_UNITS) {
    throw new Error('Supply base-unit mismatch');
  }

  if (!Array.isArray(config.allocations) || config.allocations.length !== EXPECTED_ALLOCATIONS.length) {
    throw new Error('Exactly five allocation entries are required');
  }
  const labels = new Set<string>();
  const byLabel = new Map<string, UnknownRecord>();
  for (const raw of config.allocations) {
    const allocation = record(raw, 'allocation');
    exactKeys(allocation, ['basisPoints', 'label', 'tokens'], 'allocation');
    if (typeof allocation.label !== 'string' || labels.has(allocation.label)) {
      throw new Error('Allocation labels must be unique strings');
    }
    labels.add(allocation.label);
    byLabel.set(allocation.label, allocation);
  }

  let total = 0n;
  const canonicalAllocations: OfflineAllocation[] = EXPECTED_ALLOCATIONS.map((expected) => {
    const actual = byLabel.get(expected.label);
    if (!actual || actual.tokens !== expected.tokens || actual.basisPoints !== expected.basisPoints
        || !Number.isSafeInteger(actual.basisPoints)) {
      throw new Error(`Allocation mismatch for ${expected.label}`);
    }
    const baseUnits = wholeTokensToBaseUnits(actual.tokens, `${expected.label}.tokens`);
    if (baseUnits * 10_000n !== SUPPLY_BASE_UNITS * BigInt(expected.basisPoints)) {
      throw new Error(`Allocation percentage mismatch for ${expected.label}`);
    }
    total += baseUnits;
    return {
      label: expected.label,
      tokens: expected.tokens,
      baseUnits: baseUnits.toString(),
      basisPoints: String(expected.basisPoints),
    };
  });
  if (labels.size !== EXPECTED_ALLOCATIONS.length || total !== SUPPLY_BASE_UNITS || total > U64_MAX) {
    throw new Error('Allocation sum must equal the exact supply and fit u64');
  }

  const vesting = record(config.founderVesting, 'founderVesting');
  exactKeys(vesting, VESTING_KEYS, 'founderVesting');
  if (vesting.requestedLockMonths !== 12
      || vesting.requestedLinearMonths !== 24
      || vesting.model !== 'FIXED_DAYS_ILLUSTRATION_NOT_CALENDAR_MONTHS'
      || vesting.lockDaysAssumption !== 365
      || vesting.linearDaysAssumption !== 730
      || vesting.accrualDuringLock !== false
      || vesting.beneficiary !== null
      || vesting.baseUtc !== null) {
    throw new Error('Founder vesting must remain an unapproved 365/730-day scenario');
  }
  for (const pending of ['initialCirculationTokens', 'otherBucketSchedules', 'price', 'quoteLiquidity']) {
    if (config[pending] !== null) throw new Error(`${pending} must remain unresolved`);
  }
  return canonicalAllocations;
}

/** Build a deterministic manifest only; this function has no filesystem or network side effects. */
export function buildOfflineManifest(input: unknown): OfflineManifest {
  const allocations = validateOfflineConfig(input);
  const payload = {
    schemaVersion: 1 as const,
    profile: PROFILE as typeof PROFILE,
    project: {name: 'ROBUSTO' as const, symbol: 'ROBUSTO' as const},
    mode: {
      status: 'OFFLINE_FIXTURE_ONLY' as const,
      mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET' as const,
      mainnetDisabled: true as const,
      operationsAuthorized: false as const,
      productionAdoption: false as const,
    },
    tokenomics: {
      decimals: DECIMALS as 9,
      decimalsStatus: 'OWNER_SELECTED_NOT_APPLIED_TO_PRODUCTION' as const,
      supplyTokens: SUPPLY_TOKENS.toString(),
      supplyBaseUnits: SUPPLY_BASE_UNITS.toString(),
      u64Max: U64_MAX.toString(),
      u64Headroom: (U64_MAX - SUPPLY_BASE_UNITS).toString(),
      allocationSumBaseUnits: allocations.reduce((sum, a) => sum + BigInt(a.baseUnits), 0n).toString(),
      allocations,
    },
    decisionsPending: {
      addresses: null,
      authorities: {mint: null, freeze: null, metadataUpdate: null, programUpgrade: null},
      beneficiaries: null,
      founderVesting: {
        beneficiary: null,
        baseUtc: null,
        lockDaysScenario: 365 as const,
        linearReleaseDaysScenario: 730 as const,
        approved: false as const,
      },
      initialCirculationTokens: null,
      marketPair: null,
      price: null,
      quoteLiquidity: null,
    },
    outputs: {
      solanaInstructions: false as const,
      transactions: false as const,
      signatures: false as const,
      privateKeys: false as const,
      rpcRequests: false as const,
    },
    source: {
      config: 'config/robusto-tokenomics-10b9-alternative.json' as const,
      constructor: PROFILE as typeof PROFILE,
    },
  };
  return {...payload, manifestSha256: hashJson(payload)};
}

/** CLI has a fixed local input, no flags, no output-path override, and no environment reads. */
export function renderOfflineManifest(args: readonly string[] = process.argv.slice(2)): string {
  if (args.length !== 0) throw new Error('This offline constructor accepts no runtime/network/profile arguments');
  const repositoryRoot = join(__dirname, '..');
  const configPath = join(repositoryRoot, 'config', 'robusto-tokenomics-10b9-alternative.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
  return `${JSON.stringify(buildOfflineManifest(config), null, 2)}\n`;
}

if (require.main === module) {
  try {
    process.stdout.write(renderOfflineManifest());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Offline manifest generation failed';
    process.stderr.write(`ROBUSTO_OFFLINE_MANIFEST_REJECTED: ${message}\n`);
    process.exitCode = 1;
  }
}
