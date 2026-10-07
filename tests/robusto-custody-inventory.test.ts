import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair} from '@solana/web3.js';
import {PUBLIC_ADDRESS_ROLES, validatePublicAddressInventory} from '../scripts/robusto-custody-inventory';

const empty = () => Object.fromEntries(PUBLIC_ADDRESS_ROLES.map(role => [role, null]));

test('public custody inventory starts empty and contains only the eight role keys', () => {
  const result = validatePublicAddressInventory(empty());
  assert.equal(result.status, 'EMPTY_NO_IDENTITIES');
  assert.equal(result.populatedRoles, 0);
  assert.deepEqual(Object.keys(result.publicAddresses).sort(), [...PUBLIC_ADDRESS_ROLES].sort());
});

test('inventory accepts distinct public wallet addresses without returning secret material', () => {
  const inventory: Record<string, unknown> = empty();
  for (const role of PUBLIC_ADDRESS_ROLES) inventory[role] = Keypair.generate().publicKey.toBase58();
  const result = validatePublicAddressInventory(inventory);
  assert.equal(result.status, 'COMPLETE_PUBLIC_ADDRESSES');
  assert.equal(Object.keys(result.publicAddresses).length, PUBLIC_ADDRESS_ROLES.length);
  assert.equal(JSON.stringify(result).includes('secretKey'), false);
});

test('inventory rejects missing/extra roles, duplicate addresses, arrays and key-like values without echoing them', () => {
  const wrongRoles = empty(); delete (wrongRoles as Record<string, unknown>).reserve;
  assert.throws(() => validatePublicAddressInventory(wrongRoles));
  assert.throws(() => validatePublicAddressInventory({...empty(), unexpected: null}));
  const duplicate: Record<string, unknown> = empty(); const address = Keypair.generate().publicKey.toBase58();
  duplicate.market = address; duplicate.community = address;
  assert.throws(() => validatePublicAddressInventory(duplicate));
  const privateArray = Array(64).fill(7);
  assert.throws(() => validatePublicAddressInventory({...empty(), mint_authority: privateArray}));
  assert.throws(() => validatePublicAddressInventory([]));
  assert.throws(() => validatePublicAddressInventory({...empty(), program_upgrade_authority: 'not-a-public-address'}));
});

test('inventory rejects public addresses reserved by historical PAPA/Devnet/rehearsal configuration', () => {
  const inventory: Record<string, unknown> = empty();
  inventory.market = 'ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw';
  assert.throws(() => validatePublicAddressInventory(inventory), /Historical\/rehearsal/);
});
