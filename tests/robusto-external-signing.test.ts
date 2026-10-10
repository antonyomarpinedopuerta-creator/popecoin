import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PublicKey, Transaction, TransactionInstruction} from '@solana/web3.js';
import {HandoffReview, prepareExternalHandoff, rehearseExternalHandoff} from '../scripts/robusto-external-signing';

// Public-address bytes only; there is no keypair or private seed.
const payer = new PublicKey(Buffer.alloc(32, 2));
const authority = new PublicKey(Buffer.alloc(32, 3));
function fixture(data = 1, feePayer = payer, signer = authority) {
  const tx = new Transaction({feePayer, recentBlockhash: PublicKey.default.toBase58()}).add(
    new TransactionInstruction({programId: new PublicKey(Buffer.alloc(32, 4)),
      keys: [{pubkey: signer, isSigner: true, isWritable: false}], data: Buffer.from([data])}));
  const encoded = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  const review: HandoffReview = {scope: 'OFFLINE_FIXTURE_ONLY', payer: feePayer.toBase58(),
    messageSha256: createHash('sha256').update(tx.serializeMessage()).digest('hex'),
    requiredSigners: tx.compileMessage().accountKeys.slice(0, 2).map(k => k.toBase58())};
  return {tx, encoded, review};
}

test('external unsigned handoff roundtrip preserves exact message and exposes no signing capability', async () => {
  const {encoded, review} = fixture(); let calls = 0;
  const result = await rehearseExternalHandoff(encoded, review, {reviewUnsigned: async request => {
    calls++;
    assert(Object.isFrozen(request)); assert(Object.isFrozen(request.requiredSigners));
    assert.equal(request.mainnetMode, 'MAINNET_DISABLED');
    return request.unsignedTransactionBase64;
  }});
  assert.equal(calls, 1); assert.equal(result.signed, false); assert.equal(result.sent, false);
  assert.equal(result.productionSignerIntegrated, false);
});

test('handoff rejects changed instructions, payer, signer and blockhash before adapter invocation', async () => {
  const {encoded, review, tx} = fixture(); let calls = 0;
  tx.recentBlockhash = new PublicKey(Buffer.alloc(32, 9)).toBase58();
  const changedBlockhash = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  for (const changed of [fixture(2).encoded, fixture(1, authority).encoded,
    fixture(1, payer, new PublicKey(Buffer.alloc(32, 5))).encoded, changedBlockhash]) {
    await assert.rejects(rehearseExternalHandoff(changed, review, {reviewUnsigned: async () => {calls++; return encoded;}}));
  }
  assert.equal(calls, 0);
});

test('handoff rejects adapter tampering, signatures and malformed or oversized wire data', async () => {
  const {encoded, review, tx} = fixture();
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async () => fixture(2).encoded}));
  // Arbitrary public dummy bytes are deliberately NOT a cryptographic signature.
  tx.signatures[0].signature = Buffer.alloc(64, 1);
  const dummySigned = tx.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64');
  for (const bad of [dummySigned, encoded + '\n', '', 'A'.repeat(1648)]) assert.throws(() => prepareExternalHandoff(bad, review));
  await assert.rejects(rehearseExternalHandoff(encoded, review, {reviewUnsigned: async () => dummySigned}));
  assert.throws(() => prepareExternalHandoff(encoded, {...review, scope: 'MAINNET' as any}));
});
