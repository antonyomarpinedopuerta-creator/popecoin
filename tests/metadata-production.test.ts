import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { durableUri } from '../scripts/durable-uri';
import { prepareMetadata, verifyPublishedBytes } from '../scripts/prepare-metadata';
const ar = `ar://${Buffer.alloc(32,1).toString('base64url')}`;
test('durable URI accepts canonical supported identifiers and rejects malformed addresses',()=>{
 for (const value of [ar,ar+'/metadata.json','ipfs://QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB','ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku']) assert.equal(durableUri(value),value);
 for (const value of [null,'https://mutable.invalid/x',`ar://${'B'.repeat(43)}`,`ipfs://b${'a'.repeat(58)}`,`ipfs://b${'a'.repeat(20)}`,ar+'/../x',ar+'//x',ar+'?token=x',ar+'/%2e%2e',ar+'/./x',ar+'/']) assert.throws(()=>durableUri(value));
});
test('production metadata bytes are deterministic and downloads require exact approved content',()=>{
 const prepared=prepareMetadata(ar), logo=fs.readFileSync('metadata/papa-logo.png');
 assert.deepEqual(prepareMetadata(ar),prepared);
 const parsed=JSON.parse(prepared.bytes);assert.equal(parsed.image,ar);assert.match(parsed.description,/not affiliated/);
 assert.equal(verifyPublishedBytes(prepared,Buffer.from(prepared.bytes),logo).metadataSha256,prepared.sha256);
 assert.throws(()=>verifyPublishedBytes(prepared,Buffer.from(prepared.bytes+' '),logo));
 assert.throws(()=>verifyPublishedBytes(prepared,Buffer.from(prepared.bytes),Buffer.from('wrong PNG')));
 assert.throws(()=>prepareMetadata(null));
});
