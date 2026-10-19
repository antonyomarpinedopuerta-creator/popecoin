/** Deterministic arithmetic inputs only; no identities or program instructions. */
import {founderVestedModel, FOUNDER_AMOUNT_BASE_UNITS, I64_MAX, SECONDS_PER_DAY} from '../scripts/robusto-10b9-vesting-preparation';

export function founderParityVectors() {
  const start = 365n * SECONDS_PER_DAY, end = start + 730n * SECONDS_PER_DAY;
  const relative = {totalAmountBaseUnits: FOUNDER_AMOUNT_BASE_UNITS.toString(), startOffsetSeconds: start.toString(),
    cliffOffsetSeconds: start.toString(), endOffsetSeconds: end.toString()};
  const times = [0n, start - 1n, start, start + 1n, start + 15768000n, start + 31536000n,
    start + 47304000n, end - 1n, end, end + 1n];
  return [-(1n << 63n), 0n, I64_MAX - end - 1n].flatMap(origin => times.map(time => ({
    start: (origin + start).toString(), cliff: (origin + start).toString(), end: (origin + end).toString(),
    now: (origin + time).toString(), expected: founderVestedModel(relative, time.toString()).toString(),
  })));
}
if (require.main === module) process.stdout.write(`${JSON.stringify(founderParityVectors())}\n`);
