import test from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "http";
import { createHandler } from "../app/server";
import { readVesting } from "../scripts/vesting-reader";

async function request(url: string, method = "GET", reader: typeof readVesting = async () => { throw new Error("RPC unavailable"); }) {
  let status = 200, body = ""; const headers: Record<string,string> = {};
  const response = {
    setHeader: (key: string, value: string) => { headers[key] = value; },
    writeHead: (code: number, extra: Record<string,string>) => { status = code; Object.assign(headers, extra); },
    end: (value: Buffer|string) => { body = value.toString(); },
  };
  await createHandler(reader)({ url, method } as IncomingMessage, response as unknown as ServerResponse);
  return { status, body, headers };
}
test("app serves only public allowlisted assets with CSP", async () => {
  const response = await request("/"); assert.equal(response.status, 200);
  assert.match(response.body, /SOLANA DEVNET/); assert.match(response.headers["Content-Security-Policy"], /default-src 'self'/);
  assert.equal((await request("/../../Cargo.toml")).status, 404);
  assert.equal((await request("/scripts/devnet-config.ts")).status, 404);
});
test("app rejects writes and invalid roles before invoking RPC", async () => {
  let calls = 0; const reader: typeof readVesting = async () => { calls++; throw new Error("unexpected"); };
  assert.equal((await request("/api/vesting?role=reserve", "POST", reader)).status, 405);
  assert.equal((await request("/api/vesting?role=attacker", "GET", reader)).status, 400);
  assert.equal(calls, 0);
});
test("app maps RPC failures to controlled error without leaking internals", async () => {
  const response = await request("/api/vesting?role=reserve");
  assert.equal(response.status, 502); assert.doesNotMatch(response.body, /RPC unavailable/);
  assert.match(JSON.parse(response.body).error, /Devnet/);
});
