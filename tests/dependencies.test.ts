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

import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const fromJayson = createRequire(require.resolve('jayson'));
const attackPayloads=[
 '{"__proto__":{"isAdmin":true},"name":"ROBUSTO"}',
 '{"user":{"__proto__":{"isAdmin":true},"name":"ROBUSTO"}}',
 '{"__proto__":["fake","role"],"name":"ROBUSTO"}',
 '{"__proto__":null,"value":1}',
 '{"__proto__":"string","value":true}',
 '{"__proto__":{"first":1},"__proto__":{"second":2}}',
 '{"constructor":{"prototype":{"polluted":true}},"value":1}',
 '[{"__proto__":{"isAdmin":true}},null,"🌎"]',
];
function prototypesMatch(actual:any,expected:any){
 if(actual&&typeof actual==='object'){
  assert.equal(Object.getPrototypeOf(actual),Object.getPrototypeOf(expected));
  assert.deepEqual(Object.keys(actual),Object.keys(expected));
  for(const key of Object.keys(expected))prototypesMatch(actual[key],expected[key]);
 }
}
test('Jayson streaming JSON creates own __proto__ properties, never injected prototypes',async()=>{
 const utils=fromJayson('./lib/utils');
 for(const payload of attackPayloads){
  const parsed=await new Promise<any>((resolve,reject)=>{
   const input=Readable.from([...Buffer.from(payload)].map(n=>Buffer.from([n])));
   utils.parseStream(input,{},(err:any,value:any)=>err?reject(err):resolve(value));
  });
  const baseline=JSON.parse(payload);assert.deepEqual(parsed,baseline);prototypesMatch(parsed,baseline);
  assert.equal(({} as any).isAdmin,undefined);assert.equal(({} as any).polluted,undefined);
 }
});
test('direct Assembler reviver path is protected and ordinary numbers remain compatible',async()=>{
 const Assembler=fromJayson('stream-json/Assembler'),Parser=fromJayson('stream-json/Parser');
 const reviver=(_key:string,value:any)=>typeof value==='number'?value+1:value;
 for(const payload of attackPayloads){
  const parser=new Parser(),assembler=Assembler.connectTo(parser,{reviver});
  await pipeline(Readable.from([Buffer.from(payload)]),parser);
  const expected=JSON.parse(payload,reviver);assert.deepEqual(assembler.current,expected);prototypesMatch(assembler.current,expected);
 }
});
test('locked Jayson resolves the exact reviewed assembler; JSONC feature is absent',async()=>{
 const provenance=JSON.parse(fs.readFileSync('vendor/stream-json/PROVENANCE.json','utf8'));
 const actual=fs.readFileSync(fromJayson.resolve('stream-json/Assembler'));
 assert.equal(createHash('sha256').update(actual).digest('hex'),provenance.patchedAssemblerSha256);
 assert.throws(()=>fromJayson.resolve('stream-json/jsonc/Parser'),/Cannot find module/);
 const Parser=fromJayson('stream-json/Parser');const parser=new Parser();parser.resume();
 await assert.rejects(pipeline(Readable.from(['/*comment*/true']),parser));
});
