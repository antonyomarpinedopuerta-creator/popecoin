import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { verifyBuildRecord } from "../scripts/build-record";

test("release record rejects omitted, extra, misplaced and malformed hashes", () => {
  const original = JSON.parse(fs.readFileSync("target/release-build-record.json", "utf8"));
  assert.doesNotThrow(() => verifyBuildRecord(original));
  for (const group of ["sourceHashes", "outputHashes"]) {
    for (const filename of Object.keys(original[group])) {
      const record = structuredClone(original);
      delete record[group][filename];
      assert.throws(() => verifyBuildRecord(record), /paths/);
    }
  }
  const extra = structuredClone(original);
  extra.sourceHashes["../private.json"] = "a".repeat(64);
  assert.throws(() => verifyBuildRecord(extra), /paths/);
  const malformed = structuredClone(original);
  malformed.sourceHashes["Cargo.toml"] = 42;
  assert.throws(() => verifyBuildRecord(malformed), /hash/);
  const stale = structuredClone(original);
  stale.outputHashes["target/deploy/popecoin_vesting.so"] = "0".repeat(64);
  assert.throws(() => verifyBuildRecord(stale), /Stale/);
  assert.throws(() => verifyBuildRecord({ sourceHashes: original.outputHashes, outputHashes: original.sourceHashes }), /paths/);
});

test("release record rejects newly added Rust source absent from manifest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "papa-record-"));
  try {
    fs.mkdirSync(path.join(root, "programs/popecoin_vesting/src"), { recursive: true });
    fs.writeFileSync(path.join(root, "programs/popecoin_vesting/src/new.rs"), "// additional input\n");
    const record = JSON.parse(fs.readFileSync("target/release-build-record.json", "utf8"));
    assert.throws(() => verifyBuildRecord(record, root), /paths/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
