/** Narrow custody policy validator. No planner, chain API, or identity generation. */
import {validateMintInventory, MintInventoryDeclaration} from './robusto-10b9-mint-inventory';
import {buildVestingPreparation} from './robusto-10b9-vesting-preparation';

export const ROLE_PERMISSIONS = {
  mint: ['mint_tokens', 'change_mint_authority'],
  freeze: ['freeze_token_accounts', 'change_freeze_authority'],
  metadataUpdate: ['edit_metadata'],
  vestingProgramUpgrade: ['replace_program_code'],
  liquidity_market: ['transfer_own_tokens'], community: ['transfer_own_tokens'],
  strategic_reserve: ['transfer_own_tokens'], development_operations: ['transfer_own_tokens'],
  founder: ['transfer_own_tokens'],
  founderVestingBeneficiary: ['release_vested_to_self'],
  liquidityPositionCustodian: ['manage_own_position'],
} as const;
export type CustodyRole = keyof typeof ROLE_PERMISSIONS;
export type Mechanism = 'SINGLE_SIGNER' | 'SPL_MULTISIG' | 'PROGRAM_MULTISIG_PDA' | 'MULTISIG_MANAGED_ACCOUNT' | 'NONE' | 'PENDING';
export type SignerConsumer = 'ANCHOR_SIGNER' | 'CLASSIC_SPL_TOKEN' | 'EXTERNAL_POSITION' | 'LOADER_AUTHORITY' | 'METADATA_AUTHORITY';
export interface CustodyPolicy {
  scope: 'OFFLINE_FIXTURE_ONLY'; mainnetDisabled: true; operationsAuthorized: false;
  administrativeRecovery: false; beneficiaryReplacement: false; excessSweep: false;
  roles: Array<{role: CustodyRole; controllerGroup: string | null; mechanism: Mechanism; requestedPermissions: string[]}>;
}

/** Anchor Signer checks one AccountInfo.is_signer; SPL multisig member parsing is absent. */
export function signerCompatibility(mechanism: Mechanism, consumer: SignerConsumer) {
  if (!['ANCHOR_SIGNER', 'CLASSIC_SPL_TOKEN', 'EXTERNAL_POSITION', 'LOADER_AUTHORITY', 'METADATA_AUTHORITY'].includes(consumer)) throw Error('Unknown signer consumer');
  if (!['SINGLE_SIGNER', 'SPL_MULTISIG', 'PROGRAM_MULTISIG_PDA', 'MULTISIG_MANAGED_ACCOUNT', 'NONE', 'PENDING'].includes(mechanism)) throw Error('Unknown custody mechanism');
  if (mechanism === 'NONE' || mechanism === 'PENDING') return 'PENDING';
  // "Managed" does not identify who can provide the account's signer privilege.
  if (mechanism === 'MULTISIG_MANAGED_ACCOUNT') return 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF';
  if (mechanism === 'SPL_MULTISIG' && consumer !== 'CLASSIC_SPL_TOKEN') return 'INCOMPATIBLE';
  if (consumer === 'EXTERNAL_POSITION' || consumer === 'METADATA_AUTHORITY' || mechanism === 'PROGRAM_MULTISIG_PDA') return 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF';
  return 'DECLARED_COMPATIBLE_NOT_VERIFIED';
}

function exact(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected custody object');
  const actual = Object.keys(value).sort(), expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((k, i) => k !== expected[i])) throw Error('Unsupported custody fields');
  return value as Record<string, unknown>;
}

/** Reject incompatible capabilities and detect shared public identities or controller groups.
 * Controller groups are unverified declarations: different strings do not prove independence.
 */
export function validateCustodyControls(manifest: unknown, inventoryInput: unknown, policyInput: unknown, requireComplete = false) {
  validateMintInventory(manifest, inventoryInput, {requireFinal: requireComplete});
  const allocationPlan = buildVestingPreparation(manifest).allocationPlan;
  const inventory = inventoryInput as MintInventoryDeclaration;
  const policy = exact(policyInput, ['scope', 'mainnetDisabled', 'operationsAuthorized', 'administrativeRecovery', 'beneficiaryReplacement', 'excessSweep', 'roles']);
  if (policy.scope !== 'OFFLINE_FIXTURE_ONLY' || policy.mainnetDisabled !== true || policy.operationsAuthorized !== false
      || policy.administrativeRecovery !== false || policy.beneficiaryReplacement !== false || policy.excessSweep !== false) {
    throw Error('No authorization, administrative recovery, beneficiary replacement or excess sweep exists');
  }
  if (!Array.isArray(policy.roles) || policy.roles.length !== Object.keys(ROLE_PERMISSIONS).length) throw Error('Exactly eleven distinct custody roles required');
  const declarations: Record<CustodyRole, string | null> = {...inventory.authorities, ...inventory.custodians,
    founderVestingBeneficiary: inventory.founderVestingBeneficiary, liquidityPositionCustodian: inventory.liquidityPositionCustodian};
  const seen = new Set<string>();
  const roles = policy.roles.map(raw => {
    const item = exact(raw, ['role', 'controllerGroup', 'mechanism', 'requestedPermissions']);
    if (typeof item.role !== 'string' || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, item.role) || seen.has(item.role)) throw Error('Unknown or duplicate custody role');
    seen.add(item.role);
    const role = item.role as CustodyRole;
    if (item.controllerGroup !== null && (typeof item.controllerGroup !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(item.controllerGroup))) throw Error('Invalid abstract controller group');
    const allowed: readonly string[] = ROLE_PERMISSIONS[role];
    if (!Array.isArray(item.requestedPermissions) || new Set(item.requestedPermissions).size !== item.requestedPermissions.length
        || item.requestedPermissions.some(p => typeof p !== 'string' || !allowed.includes(p))) throw Error(`Incompatible permissions for ${role}`);
    const mechanism = item.mechanism as Mechanism;
    const declaration = declarations[role];
    const consumer: SignerConsumer = role in inventory.custodians || role === 'mint' || role === 'freeze' ? 'CLASSIC_SPL_TOKEN'
      : role === 'liquidityPositionCustodian' ? 'EXTERNAL_POSITION'
      : role === 'vestingProgramUpgrade' ? 'LOADER_AUTHORITY'
      : role === 'metadataUpdate' ? 'METADATA_AUTHORITY' : 'ANCHOR_SIGNER';
    const compatibility = signerCompatibility(mechanism, consumer);
    if (compatibility === 'INCOMPATIBLE') throw Error(`SPL multisig does not satisfy required single-account signer: ${role}`);
    if (mechanism === 'NONE' && declaration !== 'NONE') throw Error('NONE requires an explicit absent-authority declaration');
    if (declaration === 'NONE' && (mechanism !== 'NONE' || item.requestedPermissions.length !== 0 || item.controllerGroup !== null)) throw Error('Absent authority cannot retain permissions or a controller');
    const unresolved = declaration === null || declaration === 'NOT_CREATED' || mechanism === 'PENDING'
      || (declaration !== 'NONE' && item.controllerGroup === null) || compatibility === 'REQUIRES_EXTERNAL_COMPATIBILITY_PROOF';
    return {role, declaration, mechanism, consumer, controllerGroup: item.controllerGroup as string | null,
      requestedPermissions: [...item.requestedPermissions].sort() as string[], compatibility, unresolved};
  }).sort((a, b) => a.role < b.role ? -1 : a.role > b.role ? 1 : 0);
  const concentration: Array<{roles: [CustodyRole, CustodyRole]; sameIdentity: boolean; sameControllerGroup: boolean}> = [];
  for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) {
    const a = roles[i], b = roles[j];
    const sameIdentity = a.declaration !== null && !['NONE', 'NOT_CREATED'].includes(a.declaration) && a.declaration === b.declaration;
    const sameControllerGroup = a.controllerGroup !== null && a.controllerGroup === b.controllerGroup;
    if (sameIdentity || sameControllerGroup) concentration.push({roles: [a.role, b.role], sameIdentity, sameControllerGroup});
  }
  if (requireComplete && (roles.some(r => r.unresolved) || concentration.length)) throw Error('Unresolved custody compatibility or concentration of powers');
  return {scope: 'OFFLINE_FIXTURE_ONLY', mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET', mainnetDisabled: true,
    operationsAuthorized: false, evidenceLevel: 'DECLARATIONS_AND_HOST_POLICY_ONLY', identityExistenceVerified: false,
    administrativeRecovery: false, beneficiaryReplacement: false, excessSweep: false,
    allocationsValidated: allocationPlan.map(a => ({label: a.label, amountBaseUnits: a.amountBaseUnits})),
    roles, concentration, readyForImplementation: false};
}

/** Matrix of evidence levels, not certification of any external implementation. */
export function technicalCustodyMatrix() {
  const boundaries: Array<{boundary: string; consumer: SignerConsumer; evidence: string}> = [
    {boundary: 'spl_mint_freeze_authorities', consumer: 'CLASSIC_SPL_TOKEN', evidence: 'spl-token-interface 2.0.0 instruction.rs: mint_to/set_authority member-signer interface'},
    {boundary: 'allocation_token_transfers', consumer: 'CLASSIC_SPL_TOKEN', evidence: 'spl-token-interface 2.0.0 instruction.rs: transfer_checked member-signer interface'},
    {boundary: 'program_upgrade_authority', consumer: 'LOADER_AUTHORITY', evidence: 'solana-loader-v3-interface 6.1.1 instruction.rs: upgrade authority is_signer=true'},
    {boundary: 'vesting_beneficiary', consumer: 'ANCHOR_SIGNER', evidence: 'initialize.rs/release.rs and anchor-lang 1.2.0 accounts/signer.rs: AccountInfo.is_signer'},
    {boundary: 'vesting_deposit_authority', consumer: 'ANCHOR_SIGNER', evidence: 'deposit.rs and anchor-spl 1.2.0 token.rs: source owner and no multisig member forwarding'},
    {boundary: 'meteora_position', consumer: 'EXTERNAL_POSITION', evidence: 'pinned cp-amm ix_remove_liquidity.rs: Signer and position owner/delegate permissions'},
  ];
  const mechanisms: Mechanism[] = ['SINGLE_SIGNER', 'SPL_MULTISIG', 'PROGRAM_MULTISIG_PDA', 'MULTISIG_MANAGED_ACCOUNT'];
  return {scope: 'OFFLINE_FIXTURE_ONLY', mainnetStatus: 'NOT_AUTHORIZED_FOR_MAINNET', mainnetDisabled: true,
    operationsAuthorized: false, evidenceLevel: 'STATIC_SOURCE_REQUIREMENTS_NOT_END_TO_END_EXECUTION',
    rows: boundaries.flatMap(boundary => mechanisms.map(mechanism => {
      const result = signerCompatibility(mechanism, boundary.consumer);
      return {...boundary, mechanism,
        compatibility: result === 'INCOMPATIBLE' ? 'DEMONSTRATED_INCOMPATIBLE_DIRECT_PATH' : 'PENDING_EXECUTION_PROOF',
        interfaceEvidence: result === 'INCOMPATIBLE' ? 'SINGLE_ACCOUNT_SIGNER_REQUIRED'
          : result === 'DECLARED_COMPATIBLE_NOT_VERIFIED' ? 'SIGNER_FORM_SUPPORTED_BY_SOURCE' : 'EXTERNAL_SIGNER_PATH_UNPROVEN',
        realSignaturesVerified: false, productionApproved: false};
    }))};
}
