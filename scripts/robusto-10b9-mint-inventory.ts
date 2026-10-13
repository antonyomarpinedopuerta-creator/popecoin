/**
 * Offline inventory validator for a future ROBUSTO 10B/9 mint declaration.
 * Public keys are syntax-checked only. This module never verifies chain state,
 * builds instructions, loads signers, or connects to Solana.
 */
import {createHash} from 'node:crypto';
import {OfflineManifest, assertOfflineManifest, renderOfflineManifest} from './robusto-10b9-offline';

export const CLASSIC_SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const MINT_INVENTORY_PROFILE = 'ROBUSTO_10B_9_MINT_INVENTORY_OFFLINE';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALLOCATION_LABELS = [
  'liquidity_market', 'community', 'strategic_reserve', 'development_operations', 'founder',
] as const;
const ROOT_KEYS = [
  'schemaVersion', 'profile', 'mintAddress', 'tokenProgramId', 'decimals', 'supplyTokens',
  'supplyBaseUnits', 'allocations', 'authorities', 'custodians', 'liquidityPositionCustodian', 'evidence',
  'founderVestingBeneficiary',
].sort();
const ALLOCATION_KEYS = ['label', 'tokens', 'baseUnits'].sort();
const AUTHORITY_KEYS = ['mint', 'freeze', 'metadataUpdate', 'vestingProgramUpgrade'].sort();
const CUSTODIAN_KEYS = [...ALLOCATION_LABELS].sort();
const EVIDENCE_KEYS = ['kind', 'rpcStateVerified'].sort();

type UnknownRecord = Record<string, unknown>;
export type AuthorityDeclaration = 'NONE' | string | null;
export type CustodianDeclaration = 'NOT_CREATED' | string | null;

export interface MintInventoryDeclaration {
  schemaVersion: 1;
  profile: typeof MINT_INVENTORY_PROFILE;
  mintAddress: string | null;
  tokenProgramId: string | null;
  decimals: 9;
  supplyTokens: string;
  supplyBaseUnits: string;
  allocations: Array<{label: string; tokens: string; baseUnits: string}>;
  authorities: {
    mint: AuthorityDeclaration;
    freeze: AuthorityDeclaration;
    metadataUpdate: AuthorityDeclaration;
    vestingProgramUpgrade: AuthorityDeclaration;
  };
  custodians: Record<(typeof ALLOCATION_LABELS)[number], CustodianDeclaration>;
  founderVestingBeneficiary: string | null;
  liquidityPositionCustodian: CustodianDeclaration;
  evidence: {kind: 'LOCAL_DECLARATION'; rpcStateVerified: false};
}

export interface MintInventoryResult {
  status: 'PENDING_IDENTITY' | 'DECLARED_UNVERIFIED';
  approved: false;
  chainStateVerified: false;
  reasons: string[];
  declarationSha256: string;
}

function asRecord(value: unknown, name: string): UnknownRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, keys: readonly string[], name: string): void {
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index])) {
    throw new Error(`${name} contains missing or unsupported fields`);
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = asRecord(value, 'canonical value');
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

/** Base58 syntax and decoded-width validation; no curve or account-existence claim. */
export function assertSolanaPublicKeyFormat(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) {
    throw new Error(`${field} must be a base58-encoded 32-byte public key`);
  }
  let decoded = 0n;
  for (const char of value) {
    const digit = B58.indexOf(char);
    if (digit < 0) throw new Error(`${field} contains a non-base58 character`);
    decoded = decoded * 58n + BigInt(digit);
  }
  let decodedBytes = 0;
  for (let remaining = decoded; remaining > 0n; remaining >>= 8n) decodedBytes += 1;
  let leadingZeroBytes = 0;
  while (value[leadingZeroBytes] === '1') leadingZeroBytes += 1;
  if (leadingZeroBytes + decodedBytes !== 32) {
    throw new Error(`${field} must decode to exactly 32 bytes`);
  }
}

function validateRole(value: unknown, field: string, required: boolean): void {
  if (value === null) {
    if (required) throw new Error(`${field} must be explicitly declared as NONE or a public key`);
    return;
  }
  if (value === 'NONE') return;
  assertSolanaPublicKeyFormat(value, field);
}

function validateCustodian(value: unknown, field: string, required: boolean, notCreatedAllowed = false): void {
  if (value === null) {
    if (required) throw new Error(`${field} must be explicitly declared`);
    return;
  }
  if (notCreatedAllowed && value === 'NOT_CREATED') return;
  assertSolanaPublicKeyFormat(value, field);
}

/** Build a null-filled template, without inventing identities or authority choices. */
export function buildPendingMintInventory(manifestInput: unknown): MintInventoryDeclaration {
  const manifest: OfflineManifest = assertOfflineManifest(manifestInput);
  return {
    schemaVersion: 1,
    profile: MINT_INVENTORY_PROFILE,
    mintAddress: null,
    tokenProgramId: null,
    decimals: 9,
    supplyTokens: manifest.tokenomics.supplyTokens,
    supplyBaseUnits: manifest.tokenomics.supplyBaseUnits,
    allocations: manifest.tokenomics.allocations.map(({label, tokens, baseUnits}) => ({label, tokens, baseUnits})),
    authorities: {mint: null, freeze: null, metadataUpdate: null, vestingProgramUpgrade: null},
    custodians: {
      liquidity_market: null,
      community: null,
      strategic_reserve: null,
      development_operations: null,
      founder: null,
    },
    founderVestingBeneficiary: null,
    liquidityPositionCustodian: null,
    evidence: {kind: 'LOCAL_DECLARATION', rpcStateVerified: false},
  };
}

/**
 * Validate a local declaration against the canonical profile. `requireFinal` rejects
 * missing identity/roles; successful results remain DECLARED_UNVERIFIED offline.
 */
export function validateMintInventory(
  manifestInput: unknown,
  declarationInput: unknown,
  options: {requireFinal?: boolean} = {},
): MintInventoryResult {
  const manifest: OfflineManifest = assertOfflineManifest(manifestInput);
  const declaration = asRecord(declarationInput, 'mint inventory');
  exactKeys(declaration, ROOT_KEYS, 'mint inventory');
  if (declaration.schemaVersion !== 1 || declaration.profile !== MINT_INVENTORY_PROFILE) {
    throw new Error('Mint inventory profile mismatch; historical 1B/6 is not accepted');
  }
  if (declaration.decimals !== 9 || !Number.isSafeInteger(declaration.decimals)) {
    throw new Error('Mint inventory decimals must be exactly 9');
  }
  if (declaration.supplyTokens !== manifest.tokenomics.supplyTokens
      || declaration.supplyBaseUnits !== manifest.tokenomics.supplyBaseUnits) {
    throw new Error('Mint inventory supply differs from the canonical 10B/9 manifest');
  }

  if (!Array.isArray(declaration.allocations) || declaration.allocations.length !== ALLOCATION_LABELS.length) {
    throw new Error('Mint inventory must preserve exactly five allocations');
  }
  const expected = new Map(manifest.tokenomics.allocations.map((row) => [row.label, row]));
  const seen = new Set<string>();
  for (const raw of declaration.allocations) {
    const allocation = asRecord(raw, 'inventory allocation');
    exactKeys(allocation, ALLOCATION_KEYS, 'inventory allocation');
    if (typeof allocation.label !== 'string' || seen.has(allocation.label)) {
      throw new Error('Mint inventory allocation labels must be unique');
    }
    seen.add(allocation.label);
    const canonicalAllocation = expected.get(allocation.label);
    if (!canonicalAllocation || allocation.tokens !== canonicalAllocation.tokens
        || allocation.baseUnits !== canonicalAllocation.baseUnits) {
      throw new Error(`Mint inventory allocation mismatch for ${allocation.label}`);
    }
  }
  if (seen.size !== ALLOCATION_LABELS.length || ALLOCATION_LABELS.some((label) => !seen.has(label))) {
    throw new Error('Mint inventory allocation set is incomplete');
  }

  const authorities = asRecord(declaration.authorities, 'authorities');
  exactKeys(authorities, AUTHORITY_KEYS, 'authorities');
  const custodians = asRecord(declaration.custodians, 'custodians');
  exactKeys(custodians, CUSTODIAN_KEYS, 'custodians');
  const evidence = asRecord(declaration.evidence, 'evidence');
  exactKeys(evidence, EVIDENCE_KEYS, 'evidence');
  if (evidence.kind !== 'LOCAL_DECLARATION' || evidence.rpcStateVerified !== false) {
    throw new Error('Offline inventory cannot claim verified Solana chain state');
  }

  const hasMint = declaration.mintAddress !== null;
  if (hasMint) assertSolanaPublicKeyFormat(declaration.mintAddress, 'mintAddress');
  const reasons: string[] = [];
  if (!hasMint) reasons.push('Mint identity has not been selected');

  if (declaration.tokenProgramId === null) {
    reasons.push('Token program identity is pending');
  } else {
    assertSolanaPublicKeyFormat(declaration.tokenProgramId, 'tokenProgramId');
    if (declaration.tokenProgramId !== CLASSIC_SPL_TOKEN_PROGRAM_ID) {
      throw new Error('Only the classic SPL Token Program is compatible with the reviewed vesting contract');
    }
  }

  const requireRoles = options.requireFinal === true;
  if (requireRoles && !hasMint) throw new Error('PENDING_IDENTITY: final mint inventory requires a declared mint address');
  if (requireRoles && declaration.tokenProgramId === null) throw new Error('Final mint inventory requires a token program declaration');
  if (!requireRoles) {
    for (const role of AUTHORITY_KEYS) if (authorities[role] === null) reasons.push(`Authority ${role} is pending`);
    for (const role of CUSTODIAN_KEYS) if (custodians[role] === null) reasons.push(`Custodian ${role} is pending`);
    if (declaration.founderVestingBeneficiary === null) reasons.push('Founder vesting beneficiary is pending');
    if (declaration.liquidityPositionCustodian === null) reasons.push('Liquidity position custodian is pending');
  }
  for (const role of AUTHORITY_KEYS) validateRole(authorities[role], `authorities.${role}`, requireRoles);
  for (const role of CUSTODIAN_KEYS) validateCustodian(custodians[role], `custodians.${role}`, requireRoles);
  validateCustodian(declaration.founderVestingBeneficiary, 'founderVestingBeneficiary', requireRoles);
  validateCustodian(declaration.liquidityPositionCustodian, 'liquidityPositionCustodian', requireRoles, true);

  if (requireRoles && reasons.length > 0) throw new Error(`Final mint inventory is incomplete: ${reasons.join('; ')}`);

  const status = hasMint ? 'DECLARED_UNVERIFIED' : 'PENDING_IDENTITY';
  if (hasMint) reasons.push('A syntactically valid local mint declaration is not on-chain verification');
  return {status, approved: false, chainStateVerified: false, reasons, declarationSha256: digest(declarationInput)};
}

/** Fixed local template CLI; refuses all runtime options and emits PENDING_IDENTITY. */
export function renderPendingMintInventory(args: readonly string[] = process.argv.slice(2)): string {
  if (args.length !== 0) throw new Error('Mint inventory template accepts no profile, identity, or network arguments');
  const manifest = JSON.parse(renderOfflineManifest([])) as unknown;
  const declaration = buildPendingMintInventory(manifest);
  return `${JSON.stringify({result: validateMintInventory(manifest, declaration), declaration}, null, 2)}\n`;
}

if (require.main === module) {
  try {
    process.stdout.write(renderPendingMintInventory());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Offline mint inventory generation failed';
    process.stderr.write(`ROBUSTO_MINT_INVENTORY_REJECTED: ${message}\n`);
    process.exitCode = 1;
  }
}

