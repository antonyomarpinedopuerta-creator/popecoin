/** Read-only HTTP application -> Devnet rehearsal. No wallet/signing entry points. */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { createHandler } from "../app/server";
import { readDevnetProgram } from "./devnet-program";
import { readMetadata } from "./read-metadata";
import { BENEFICIARIES } from "./vesting-reader";
import { DEVNET_MINT, DEVNET_PROGRAM_ID } from "./devnet-config";

async function main() {
  const destination = "target/devnet-rehearsal.json";
  fs.mkdirSync("target", { recursive: true });
  const record: Record<string, unknown> = { status: "incomplete", observedAt: new Date().toISOString(),
    scope: "Readonly app HTTP -> Devnet accounts and metadata; no signed lifecycle or deployment" };
  const save = () => { fs.writeFileSync(destination + ".tmp", JSON.stringify(record, null, 2) + "\n"); fs.renameSync(destination + ".tmp", destination); };
  save();
  const server = http.createServer(createHandler());
  try {
    record.head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.equal(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }), "", "Commit before collecting rehearsal evidence");
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address(); assert(address && typeof address === "object");
    const base = `http://127.0.0.1:${address.port}`;
    const results = [];
    for (const path of ["/", "/app.js", "/style.css"]) {
      const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200); assert.match(response.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/);
      assert((await response.text()).length > 0);
    }
    for (const role of ["reserve", "founder"] as const) {
      const response = await fetch(`${base}/api/vesting?role=${role}`, { signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200);
      const state = await response.json() as Record<string, any>;
      assert.equal(state.cluster, "devnet"); assert.equal(state.program, DEVNET_PROGRAM_ID.toBase58());
      assert.equal(state.mint, DEVNET_MINT.toBase58()); assert.equal(state.beneficiary, BENEFICIARIES[role]);
      assert.equal(state.total, role === "reserve" ? "3000000000000" : "1000000000000");
      assert.equal(state.shortfall, "0"); assert.equal(state.frozen, false);
      results.push({ role, ...state });
    }
    record.appSnapshots = results;
    record.program = await readDevnetProgram();
    assert.equal((record.program as { historicalMatch: boolean }).historicalMatch, true);
    record.metadata = await readMetadata();
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), record.head);
    assert.equal(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }), "");
    record.status = "passed"; save();
    console.log(`PASS: ${destination}; signed Devnet lifecycle still requires external authorization/custody`);
  } catch {
    record.status = "failed"; save();
    throw new Error("Readonly Devnet rehearsal failed; evidence invalid (RPC, state or local server unavailable)");
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
