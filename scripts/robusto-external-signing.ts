/** Offline rehearsal of the external signer handoff. No keys, signatures or RPC. */
import {createHash} from 'node:crypto';
import {Transaction} from '@solana/web3.js';
import {performance} from 'node:perf_hooks';
import {Idl} from '@coral-xyz/anchor';
import {Step, validateProduction, address} from './robusto-production';
import {validatePreparedStage} from './robusto-preflight';
import {openFixtureJournal} from './robusto-unsigned-journal';

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
  reviewUnsigned(request: ExternalHandoff, signal: AbortSignal): Promise<string>;
}

export async function rehearseExternalHandoff(encoded: string, review: HandoffReview, adapter: FixtureReviewAdapter,
  options: {signal?: AbortSignal; timeoutMs?: number} = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw Error('Review timeout must be 1..60000 ms');
  if (options.signal?.aborted) throw Error('Unsigned review cancelled');
  const request = prepareExternalHandoff(encoded, review);
  const started = performance.now();
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Unsigned review cancelled'));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (() => void) | undefined;
  let returned: string;
  try {
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectAbort, {once: true});
    });
    options.signal?.addEventListener('abort', cancel, {once: true});
    timer = setTimeout(() => controller.abort(new Error('Unsigned review timed out')), timeoutMs);
    returned = await Promise.race([Promise.resolve().then(() => {
      if (controller.signal.aborted) throw controller.signal.reason;
      return adapter.reviewUnsigned(request, controller.signal);
    }), interrupted]);
    if (controller.signal.aborted) throw controller.signal.reason;
    if (performance.now() - started >= timeoutMs) {
      controller.abort(new Error('Unsigned review timed out'));
      throw controller.signal.reason;
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
  }
  prepareExternalHandoff(returned, {scope: request.scope, messageSha256: request.messageSha256,
    payer: request.payer, requiredSigners: request.requiredSigners});
  if (returned !== request.unsignedTransactionBase64) throw Error('External adapter changed transaction bytes');
  return {status: 'PASSED_UNSIGNED_HANDOFF_ONLY', mainnetMode: 'MAINNET_DISABLED',
    messageSha256: request.messageSha256, requiredSigners: [...request.requiredSigners],
    signed: false, sent: false, productionSignerIntegrated: false};
}

/** Fixture session: optionally shares permanent local tombstones across processes.
 * Omitting journalDirectory keeps memory-only behavior. Never authorizes sign/send. */
export function createCanonicalFixtureSession(journalDirectory?: string) {
  const journal = journalDirectory === undefined ? undefined : openFixtureJournal(journalDirectory);
  const consumed = new Set<string>();
  return {async review(p: any, idl: Idl, elf: Buffer, step: Step, encoded: string,
    expected: HandoffReview, adapter: FixtureReviewAdapter,
    options: {signal?: AbortSignal; timeoutMs?: number} = {}, maxProgramBytes?: number) {
    validateProduction(p);
    if (idl.address !== p.program) throw Error('Canonical IDL/program mismatch');
    validatePreparedStage(p, idl, elf, step, maxProgramBytes);
    const request = prepareExternalHandoff(encoded, expected);
    const observed = Transaction.from(Buffer.from(encoded, 'base64'));
    const canonical = new Transaction({feePayer: address(p.payer), recentBlockhash: observed.recentBlockhash})
      .add(...step.instructions);
    if (canonical.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64') !== encoded)
      throw Error('Unsigned transaction differs from canonical stage');
    if (consumed.has(request.messageSha256)) throw Error('Duplicate fixture request; message already consumed');
    journal?.reserve(request.messageSha256);
    consumed.add(request.messageSha256);
    // Snapshot immutable primitives before the adapter can mutate caller-owned config/stage/review.
    const bound = {scope: request.scope, messageSha256: request.messageSha256,
      payer: request.payer, requiredSigners: request.requiredSigners};
    const label = step.label, kind = step.kind;
    const result = await rehearseExternalHandoff(encoded, bound, adapter, options);
    return {...result, label, kind, canonicalStageVerified: true};
  }};
}
