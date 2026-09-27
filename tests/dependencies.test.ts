import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { createRequire } from "node:module";

test("Anchor's patched TOML parses project configuration and rejects prototype pollution", () => {
  const fromAnchor = createRequire(require.resolve("@coral-xyz/anchor"));
  const toml = fromAnchor("toml");
  assert.equal(fromAnchor("toml/package.json").version, "4.2.0");
  const config = toml.parse(fs.readFileSync("Anchor.toml", "utf8"));
  assert.equal(config.provider.cluster, "devnet");
  for (const payload of [
    '[a.b]\ny = 1\n[a.b.y.__proto__.__proto__]\npapaPolluted = "yes"',
    'aa = 1\n[[a]]\n[aa.__proto__.__proto__]\npapaPolluted = "yes"',
  ]) {
    try {
      assert.throws(() => toml.parse(payload));
      assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "papaPolluted"), false);
    } finally { delete (Object.prototype as Record<string, unknown>).papaPolluted; }
  }
});

test("Jayson uses patched CommonJS UUIDs and rejects undersized output buffers", () => {
  const fromJayson = createRequire(require.resolve("jayson"));
  const uuid = fromJayson("uuid");
  assert.equal(fromJayson("uuid/package.json").version, "11.1.1");
  const generate = fromJayson("./lib/generateRequest");
  const request = generate("getSlot", [], undefined, { version: 2 });
  assert.equal(request.method, "getSlot");
  assert.equal(request.jsonrpc, "2.0");
  assert.equal(uuid.validate(request.id), true);
  assert.throws(() => uuid.v3("papa", uuid.v3.DNS, new Uint8Array(1)), RangeError);
});

test("Solana UTF-8 codecs have their declared peer and preserve non-ASCII metadata", () => {
  const fromSpl = createRequire(require.resolve("@solana/spl-token"));
  const fromCodecs = createRequire(fromSpl.resolve("@solana/codecs-strings"));
  assert.ok(fromCodecs.resolve("fastestsmallesttextencoderdecoder"));
  const codec = fromCodecs("@solana/codecs-strings").getUtf8Codec();
  for (const text of ["PAPA", "Reserva · Fundación 🪙", "", "a\u0301"]) {
    assert.deepEqual(Buffer.from(codec.encode(text)), Buffer.from(text, "utf8"));
    assert.equal(codec.decode(codec.encode(text)), text);
  }
});
