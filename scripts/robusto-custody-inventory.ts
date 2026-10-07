import fs from 'node:fs';
import path from 'node:path';
import {PublicKey} from '@solana/web3.js';
import {protectedAddresses} from './robusto-production';

export const PUBLIC_ADDRESS_ROLES = [
  'market', 'community', 'reserve', 'team_founder', 'operational_payer',
  'mint_authority', 'metadata_update_authority', 'program_upgrade_authority',
] as const;

/** Validates public addresses only; never reads keypair files or echoes rejected values. */
export function validatePublicAddressInventory(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Inventory must be a role-to-address object');
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row).sort();
  const expected = [...PUBLIC_ADDRESS_ROLES].sort();
  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) throw new Error('Inventory role set mismatch');

  const seen = new Set<string>();
  const protectedKeys = protectedAddresses();
  const publicAddresses: Record<string, string | null> = {};
  let populated = 0;
  for (const role of PUBLIC_ADDRESS_ROLES) {
    const value = row[role];
    if (value === null) { publicAddresses[role] = null; continue; }
    if (typeof value !== 'string' || value.length > 44) throw new Error('Inventory values must be null or canonical public addresses');
    let key: PublicKey;
    try { key = new PublicKey(value); } catch { throw new Error('Invalid public address in inventory'); }
    const address = key.toBase58();
    if (address !== value || key.equals(PublicKey.default) || !PublicKey.isOnCurve(key.toBytes())) throw new Error('Inventory requires canonical on-curve wallet addresses');
    if (protectedKeys.has(address)) throw new Error('Historical/rehearsal addresses cannot be used for production custody');
    if (seen.has(address)) throw new Error('Custody roles must have distinct public addresses');
    seen.add(address); populated += 1; publicAddresses[role] = address;
  }
  return {status: populated === 0 ? 'EMPTY_NO_IDENTITIES' : populated === expected.length ? 'COMPLETE_PUBLIC_ADDRESSES' : 'PARTIAL_PUBLIC_ADDRESSES', populatedRoles: populated, publicAddresses};
}

if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw new Error('This validator accepts no path or key material');
    const inventoryPath = path.resolve(__dirname, '../config/robusto-mainnet-public-addresses.json');
    const result = validatePublicAddressInventory(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Do not print input values, parser fragments, paths, or key-like data.
    console.error('Public address inventory rejected; only eight canonical public wallet addresses or null are allowed.');
    process.exitCode = 1;
  }
}
