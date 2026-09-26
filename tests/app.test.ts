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

test("app handles malformed request targets without rejecting its handler", async () => {
  for (const url of ["//[", "http://example.com/", "//example.com/api/vesting?role=reserve"]) {
    assert.equal((await request(url)).status, 400);
  }
  for (const url of ["/constructor", "/__proto__", "/toString"]) assert.equal((await request(url)).status, 404);
});

test("app limits concurrent RPC reads and recovers after errors", async () => {
  let calls = 0;
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const reader: typeof readVesting = async () => { calls++; await gate; throw new Error("RPC failed"); };
  const handler = createHandler(reader);
  const response = () => {
    const result = { status: 0, body: "" };
    const res = { setHeader() {}, writeHead(code: number) { result.status = code; },
      end(body: string) { result.body = body; } } as unknown as ServerResponse;
    return { result, res };
  };
  const req = { url: "/api/vesting?role=reserve", method: "GET" } as IncomingMessage;
  const first = response(), second = response(), third = response();
  const pending = [handler(req, first.res), handler(req, second.res)];
  await handler(req, third.res);
  assert.equal(third.result.status, 429); assert.equal(calls, 2);
  finish(); await Promise.all(pending);
  assert.equal(first.result.status, 502);
  await handler(req, third.res);
  assert.equal(third.result.status, 502); assert.equal(calls, 3);
});
