import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { preparePlan, durableUri, verifyLocalMetadata } from "../scripts/production-plan";
const input = { mint: new PublicKey(Buffer.alloc(32, 7)).toBase58(), startUtc: "2027-01-01T00:00:00Z", imageUri: `ar://${"A".repeat(43)}`, metadataUri: `ar://${"B".repeat(43)}` };
test("offline plan reconciles supply, UTC dates and distinct vesting vaults", () => {
  const plan = preparePlan(input);
  assert.equal(plan.allocations.reduce((sum, a) => sum + BigInt(a.amount), 0n), 10000000000000n);
  const reserve = plan.allocations.find(a => a.role === "reserve")!, founder = plan.allocations.find(a => a.role === "founder")!;
  assert.equal(reserve.cliff! - reserve.start!, 90 * 86400); assert.equal(founder.cliff! - founder.start!, 180 * 86400);
  assert.equal(reserve.end! - reserve.start!, 730 * 86400); assert.notEqual(reserve.vault, founder.vault);
});
test("production plan rejects pending parameters, implicit timezone and invalid calendar", () => {
  assert.throws(() => preparePlan({ ...input, mint: null }), /pending/);
  for (const startUtc of ["2027-01-01", "2027-02-30T00:00:00Z", "2027-01-01T00:00:00+01:00"]) assert.throws(() => preparePlan({ ...input, startUtc }));
  assert.throws(() => durableUri("https://example.com/mutable.json"));
  assert.throws(() => durableUri(`${input.imageUri}/../secret`));
  assert.equal(verifyLocalMetadata().name, "PAPA");
});
