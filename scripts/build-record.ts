import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// Derive the complete set independently of the untrusted build record.
export function releaseInputs(root = "."): string[] {
  const walk = (directory: string): string[] => fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap(entry => {
      const filename = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error("Build inputs must not be symbolic links");
      return entry.isDirectory() ? walk(filename) : filename.endsWith(".rs") ? [filename] : [];
    });
  return ["Cargo.toml", "Cargo.lock", "rust-toolchain.toml", "Anchor.toml",
    "programs/popecoin_vesting/Cargo.toml", "scripts/build-release.py",
    ...walk("programs/popecoin_vesting/src")].sort();
}
export const RELEASE_OUTPUTS = ["target/deploy/popecoin_vesting.so", "target/idl/popecoin_vesting.json",
  "target/types/popecoin_vesting.ts"];

export function verifyBuildRecord(record: unknown, root = ".") {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Invalid build record");
  const value = record as Record<string, unknown>;
  for (const [name, required] of [["sourceHashes", releaseInputs(root)], ["outputHashes", RELEASE_OUTPUTS]] as const) {
    const group = value[name];
    if (!group || typeof group !== "object" || Array.isArray(group) ||
        JSON.stringify(Object.keys(group).sort()) !== JSON.stringify([...required].sort())) {
      throw new Error(`Incomplete or unexpected ${name} paths; rebuild the candidate`);
    }
    for (const filename of required) {
      const expected = (group as Record<string, unknown>)[filename];
      if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) throw new Error("Invalid build hash");
      const local = path.join(root, filename);
      if (!fs.existsSync(local) || fs.lstatSync(local).isSymbolicLink() ||
          createHash("sha256").update(fs.readFileSync(local)).digest("hex") !== expected) {
        throw new Error(`Stale build input/output: ${filename}; run npm run build:safe`);
      }
    }
  }
}
