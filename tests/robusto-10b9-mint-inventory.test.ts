import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertSolanaPublicKeyFormat,
  buildPendingMintInventory,
  CLASSIC_SPL_TOKEN_PROGRAM_ID,
  MINT_INVENTORY_PROFILE,
  renderPendingMintInventory,
  validateMintInventory,
} from '../scripts/robusto-10b9-mint-inventory';
import {buildOfflineManifest} from '../scripts/robusto-10b9-offline';

const CONFIG_PATH = 'config/robusto-tokenomics-10b9-alternative.json';
const TEST_PUBKEY = '11111111111111111111111111111111'; // Syntactic test value only; not a project identity.

function canonicalManifest(): any {
  return buildOfflineManifest(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
}

function inventory(): any {
  const declaration = buildPendingMintInventory(canonicalManifest());
  declaration.mintAddress = TEST_PUBKEY;
  declaration.tokenProgramId = CLASSIC_SPL_TOKEN_PROGRAM_ID;
  declaration.authorities = {
    mint: 'NONE',
    freeze: 'NONE',
    metadataUpdate: 'NONE',
    vestingProgramUpgrade: TEST_PUBKEY,
  };
  declaration.custodians = {
    liquidity_market: TEST_PUBKEY,
    community: TEST_PUBKEY,
    strategic_reserve: TEST_PUBKEY,
    development_operations: TEST_PUBKEY,
    founder: TEST_PUBKEY,
  };
  declaration.founderVestingBeneficiary = TEST_PUBKEY;
  declaration.liquidityPositionCustodian = TEST_PUBKEY;
  return declaration;
}

test('missing identity remains PENDING_IDENTITY and final validation rejects it', () => {
  const manifest = canonicalManifest();
  const pending = buildPendingMintInventory(manifest);
  assert.equal(pending.mintAddress, null);
  assert.equal(pending.tokenProgramId, null);
  assert.equal(validateMintInventory(manifest, pending).status, 'PENDING_IDENTITY');
  assert.throws(() => validateMintInventory(manifest, pending, {requireFinal: true}), /PENDING_IDENTITY/);
});

test('final declarations require valid base58 32-byte mint and the classic Token Program', () => {
  assert.doesNotThrow(() => assertSolanaPublicKeyFormat(TEST_PUBKEY, 'test key'));
  for (const malformed of ['', 'not-a-pubkey', '0'.repeat(32), '1'.repeat(31), 'z'.repeat(45)]) {
    assert.throws(() => assertSolanaPublicKeyFormat(malformed, 'mintAddress'));
  }
  const manifest = canonicalManifest();
  const badMint = inventory();
  badMint.mintAddress = 'bad!';
  assert.throws(() => validateMintInventory(manifest, badMint, {requireFinal: true}), /base58|32-byte/);
  const wrongProgram = inventory();
  wrongProgram.tokenProgramId = TEST_PUBKEY;
  assert.throws(() => validateMintInventory(manifest, wrongProgram), /classic SPL Token Program/);
});

test('declared inventory is never approved or represented as chain-verified offline', () => {
  const result = validateMintInventory(canonicalManifest(), inventory(), {requireFinal: true});
  assert.equal(result.status, 'DECLARED_UNVERIFIED');
  assert.equal(result.approved, false);
  assert.equal(result.chainStateVerified, false);
  assert.match(result.reasons.join(' '), /not on-chain verification/);
});

test('rejects decimals, supply and historical profile substitutions', () => {
  const manifest = canonicalManifest();
  const wrongDecimals = inventory();
  wrongDecimals.decimals = 6;
  assert.throws(() => validateMintInventory(manifest, wrongDecimals), /decimals/);
  const wrongSupply = inventory();
  wrongSupply.supplyBaseUnits = '1000000000000000';
  assert.throws(() => validateMintInventory(manifest, wrongSupply), /supply differs/);
  const historical = inventory();
  historical.profile = 'ROBUSTO_PRODUCTION_1B_6';
  assert.throws(() => validateMintInventory(manifest, historical), /profile mismatch/);
  const unsafeNumber = inventory();
  unsafeNumber.supplyTokens = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateMintInventory(manifest, unsafeNumber), /supply differs/);
});

test('rejects altered, duplicate, missing and founder-mismatched allocations', () => {
  const manifest = canonicalManifest();
  for (const mutate of [
    (value: any) => { value.allocations[0].tokens = '3999999999'; },
    (value: any) => { value.allocations[4].tokens = '1000001'; },
    (value: any) => { value.allocations[4].label = 'community'; },
    (value: any) => { value.allocations.pop(); },
    (value: any) => { value.allocations[4].baseUnits = '1000000000000001'; },
  ]) {
    const changed = inventory();
    mutate(changed);
    assert.throws(() => validateMintInventory(manifest, changed));
  }
});

test('final inventory requires explicit authorities and custody roles', () => {
  const manifest = canonicalManifest();
  const missingAuthority = inventory();
  missingAuthority.authorities.freeze = null;
  assert.throws(() => validateMintInventory(manifest, missingAuthority, {requireFinal: true}), /authorities\.freeze/);
  const missingCustodian = inventory();
  missingCustodian.custodians.founder = null;
  assert.throws(() => validateMintInventory(manifest, missingCustodian, {requireFinal: true}), /custodians\.founder/);
  const missingBeneficiary = inventory();
  missingBeneficiary.founderVestingBeneficiary = null;
  assert.throws(() => validateMintInventory(manifest, missingBeneficiary, {requireFinal: true}), /founderVestingBeneficiary/);
  const sentinelBeneficiary = inventory();
  sentinelBeneficiary.founderVestingBeneficiary = 'NONE';
  assert.throws(() => validateMintInventory(manifest, sentinelBeneficiary, {requireFinal: true}), /base58|32-byte/);
  const sentinelCustodian = inventory();
  sentinelCustodian.custodians.community = 'NONE';
  assert.throws(() => validateMintInventory(manifest, sentinelCustodian, {requireFinal: true}), /base58|32-byte/);
  const malformedAuthority = inventory();
  malformedAuthority.authorities.mint = 'not-a-key';
  assert.throws(() => validateMintInventory(manifest, malformedAuthority), /base58|32-byte/);
  const noPoolYet = inventory();
  noPoolYet.liquidityPositionCustodian = 'NOT_CREATED';
  assert.equal(validateMintInventory(manifest, noPoolYet, {requireFinal: true}).status, 'DECLARED_UNVERIFIED');
});

test('rejects attempts to claim network verification or approved status', () => {
  const manifest = canonicalManifest();
  const falseEvidence = inventory();
  falseEvidence.evidence.rpcStateVerified = true;
  assert.throws(() => validateMintInventory(manifest, falseEvidence), /cannot claim verified/);
  const fakeApproval = inventory();
  fakeApproval.approved = true;
  assert.throws(() => validateMintInventory(manifest, fakeApproval), /unsupported fields/);
});

test('pending template preserves canonical manifest identity and all five buckets', () => {
  const manifest = canonicalManifest();
  const template = buildPendingMintInventory(manifest);
  assert.equal(template.profile, MINT_INVENTORY_PROFILE);
  assert.equal(template.supplyTokens, '10000000000');
  assert.equal(template.supplyBaseUnits, '10000000000000000000');
  assert.equal(template.founderVestingBeneficiary, null);
  assert.deepEqual(template.allocations.map((row) => [row.label, row.tokens]), [
    ['liquidity_market', '4000000000'],
    ['community', '3000000000'],
    ['strategic_reserve', '1500000000'],
    ['development_operations', '1499000000'],
    ['founder', '1000000'],
  ]);
  const tamperedManifest = {...manifest, manifestSha256: '0'.repeat(64)};
  assert.throws(() => buildPendingMintInventory(tamperedManifest), /differs from the validated local/);
});

test('module and imported offline profile cannot access keys, signatures, RPC or transaction APIs', () => {
  const paths = [
    'scripts/robusto-10b9-mint-inventory.ts',
    'scripts/robusto-10b9-offline.ts',
  ];
  for (const path of paths) {
    const source = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /process\.env|@solana|Keypair|Connection|fetch\s*\(|https?:\/\/|signTransaction|TransactionInstruction|sendTransaction/);
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('node:') || match[1].startsWith('.'), `${path} imports ${match[1]}`);
    }
  }
  const manifest = canonicalManifest();
  const declaration = buildPendingMintInventory(manifest);
  assert.equal(declaration.evidence.rpcStateVerified, false);
  assert.equal(validateMintInventory(manifest, declaration).approved, false);
});

test('fixed template CLI reports PENDING_IDENTITY and rejects all parameters', () => {
  const output = renderPendingMintInventory([]);
  const parsed = JSON.parse(output);
  assert.equal(parsed.result.status, 'PENDING_IDENTITY');
  assert.equal(parsed.result.approved, false);
  assert.equal(parsed.declaration.mintAddress, null);
  assert.equal(renderPendingMintInventory([]), output);
  assert.throws(() => renderPendingMintInventory(['--cluster', 'devnet']));
});
