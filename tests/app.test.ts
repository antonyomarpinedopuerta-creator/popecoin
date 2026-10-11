import test from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "http";
import { createHandler } from "../app/server";
import { publicDataSource } from "../app/market-data";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

async function request(url: string, method = "GET") {
  let status = 200; let body: Buffer | string = ""; const headers: Record<string, string> = {};
  const response = {
    setHeader: (key: string, value: string) => { headers[key] = value; },
    writeHead: (code: number, extra: Record<string, string> = {}) => { status = code; Object.assign(headers, extra); },
    end: (value?: Buffer | string) => { body = value ?? ""; },
  };
  await createHandler()({ url, method } as IncomingMessage, response as unknown as ServerResponse);
  return { status, body, headers };
}

test("landing page communicates proposal-only and unlaunched status", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  const html = String(response.body);
  assert.match(html, /ROBUSTO todavía no está en circulación/);
  assert.match(html, /NO DISPONIBLE PARA COMPRA/);
  assert.match(html, /Atomicidad nativa pendiente/);
  assert.match(html, /Diez hallazgos de dependencias abiertos/);
  assert.match(html, /preguntas frecuentes/i);
  assert.doesNotMatch(html, /SOLANA DEVNET|PAPA · vesting/);
});

test("product endpoint exposes only exact unapproved 10B/9 proposal using integer strings", async () => {
  const response = await request("/api/product");
  assert.equal(response.status, 200);
  const product = JSON.parse(String(response.body));
  assert.equal(product.name, "ROBUSTO");
  assert.equal(product.projectStatus, "NOT_DEPLOYED");
  assert.equal(product.availability, "NOT_AVAILABLE_FOR_PURCHASE");
  assert.equal(product.authorization, false);
  assert.equal(product.mainnetDisabled, true);
  assert.equal(product.scope, "OFFLINE_FIXTURE_ONLY");
  assert.deepEqual(product.supply, {
    tokens: "10000000000", decimals: 9, baseUnits: "10000000000000000000", fixedProposed: true,
  });
  assert.equal(product.allocations.reduce((sum: bigint, row: { tokens: string }) => sum + BigInt(row.tokens), 0n), 10_000_000_000n);
  assert.deepEqual(product.allocations.map((row: { label: string; tokens: string; percent: string }) => [row.label, row.tokens, row.percent]), [
    ["Mercado y liquidez", "4000000000", "40.00%"],
    ["Comunidad", "3000000000", "30.00%"],
    ["Reserva estratégica", "1500000000", "15.00%"],
    ["Desarrollo y operaciones", "1499000000", "14.99%"],
    ["Fundador", "1000000", "0.01%"],
  ]);
  assert.equal(product.initialCirculationTokens, null);
  assert.equal(product.founderPersonalFunding, "0");
  assert.deepEqual(product.founderVesting, {
    allocationTokens: "1000000", lockDaysAssumption: 365, linearDaysAssumption: 730,
    beneficiarySelected: false, datesSelected: false, approved: false,
  });
  assert.equal(product.trading.creatorApprovalRequiredForNormalSwaps, false);
  assert.equal(product.trading.creatorComputerRequiredForNormalSwaps, false);
});

test("market endpoint never fabricates a market snapshot or metrics", async () => {
  const response = await request("/api/market");
  assert.equal(response.status, 200);
  assert.equal(publicDataSource, null);
  const market = JSON.parse(String(response.body));
  assert.deepEqual(market, { status: "NOT_DEPLOYED", source: "NONE_CONFIGURED", data: null });
  assert.doesNotMatch(String(response.body), /price|volume|liquidity|marketCap|balance/i);
});

test("app is read-only, loopback-oriented, allowlisted and protected by same-origin policy", async () => {
  const page = await request("/");
  assert.match(String(page.headers["Content-Security-Policy"]), /connect-src 'self'/);
  assert.match(String(page.headers["Content-Security-Policy"]), /object-src 'none'/);
  assert.equal(page.headers["X-Frame-Options"], "DENY");
  assert.equal(page.headers["X-Content-Type-Options"], "nosniff");
  for (const pathName of ["/api/product", "/api/market", "/"]) {
    const write = await request(pathName, "POST");
    assert.equal(write.status, 405);
    assert.equal(write.headers.Allow, "GET");
  }
  for (const pathName of ["/../../Cargo.toml", "/scripts/devnet-config.ts", "/constructor", "/toString"]) {
    assert.equal((await request(pathName)).status, 404);
  }
  assert.equal((await request("//example.invalid")).status, 400);
});

test("static assets contain no external service, wallet or Solana connection bootstrap", async () => {
  const html = await request("/");
  const javascript = await request("/app.js");
  const css = await request("/style.css");
  assert.equal(javascript.status, 200);
  assert.equal(css.status, 200);
  assert.doesNotMatch(String(html.body), /https?:\/\//i);
  assert.doesNotMatch(String(javascript.body), /@solana|web3\.js|signTransaction|sendTransaction|devnet\.solana|mainnet-beta/i);
  assert.doesNotMatch(String(css.body), /@import\s+url\(|https?:\/\//i);
  const asset = await request("/assets/robusto-logo.png");
  assert.equal(asset.status, 200);
  const diskAsset = fs.readFileSync(path.resolve(__dirname, "../metadata/robusto/robusto-logo.png"));
  assert.ok(Buffer.isBuffer(asset.body));
  assert.deepEqual(asset.body, diskAsset);
  assert.equal(createHash("sha256").update(asset.body).digest("hex"), "32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce");
});
