/** Offline rehearsal of the external signer handoff. No keys, signatures or RPC. */
import {createHash} from 'node:crypto';
import {Transaction} from '@solana/web3.js';

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export type HandoffReview = {
  scope: 'OFFLINE_FIXTURE_ONLY';
  messageSha256: string;
  payer: string;
  requiredSigners: readonly string[];
};

function inspectUnsigned(encoded: string) {
  if (typeof encoded !== 'string' || encoded.length > 1644) throw Error('Invalid transaction encoding');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 1232 || bytes.toString('base64') !== encoded) throw Error('Canonical bounded base64 required');
  const tx = Transaction.from(bytes);
  if (tx.signatures.some(s => s.signature !== null)) throw Error('Rehearsal rejects all signatures');
  if (!tx.serialize({requireAllSignatures: false, verifySignatures: false}).equals(bytes)) throw Error('Canonical legacy transaction required');
  const message = tx.compileMessage();
  if (!message.instructions.length || !tx.feePayer) throw Error('Instructions and payer required');
  return {messageSha256: hash(tx.serializeMessage()), payer: tx.feePayer.toBase58(),
    requiredSigners: message.accountKeys.slice(0, message.header.numRequiredSignatures).map(k => k.toBase58())};
}

/** Expected review is supplied independently by the caller, never inferred from a response. */
export function prepareExternalHandoff(encoded: string, review: HandoffReview) {
  if (review.scope !== 'OFFLINE_FIXTURE_ONLY') throw Error('Only offline fixture review is supported');
  const observed = inspectUnsigned(encoded);
  if (observed.messageSha256 !== review.messageSha256 || observed.payer !== review.payer ||
      JSON.stringify(observed.requiredSigners) !== JSON.stringify(review.requiredSigners)) throw Error('Transaction differs from reviewed message/payer/signers');
  return Object.freeze({status: 'UNSIGNED_FIXTURE_NOT_AUTHORIZATION' as const,
    mainnetMode: 'MAINNET_DISABLED' as const, scope: review.scope,
    ...observed, requiredSigners: Object.freeze([...observed.requiredSigners]),
    unsignedTransactionBase64: encoded});
}

export type ExternalHandoff = ReturnType<typeof prepareExternalHandoff>;
export interface FixtureReviewAdapter {
  // Deliberately no sign/send capability. Hardware compatibility remains pending.
  reviewUnsigned(request: ExternalHandoff): Promise<string>;
}

export async function rehearseExternalHandoff(encoded: string, review: HandoffReview, adapter: FixtureReviewAdapter) {
  const request = prepareExternalHandoff(encoded, review);
  const returned = await adapter.reviewUnsigned(request);
  prepareExternalHandoff(returned, {scope: request.scope, messageSha256: request.messageSha256,
    payer: request.payer, requiredSigners: request.requiredSigners});
  if (returned !== request.unsignedTransactionBase64) throw Error('External adapter changed transaction bytes');
  return {status: 'PASSED_UNSIGNED_HANDOFF_ONLY', mainnetMode: 'MAINNET_DISABLED',
    messageSha256: request.messageSha256, requiredSigners: [...request.requiredSigners],
    signed: false, sent: false, productionSignerIntegrated: false};
}
