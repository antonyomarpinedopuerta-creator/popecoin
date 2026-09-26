import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";

const EXPECTED_MAINNET_PROGRAM_ID =
  "AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn";

const LIB_RS = path.join(
  "programs",
  "popecoin_vesting",
  "src",
  "lib.rs"
);

const IDL = path.join(
  "target",
  "idl",
  "popecoin_vesting.json"
);

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const lib = fs.readFileSync(LIB_RS, "utf8");
const declareMatch = lib.match(/declare_id!\("([^"]+)"\)/);

if (!declareMatch) {
  fail("declare_id! not found in lib.rs");
}

const declaredProgramId = declareMatch[1];

if (!fs.existsSync(IDL)) {
  fail("IDL not found. Build the intended release candidate first.");
}

const idl = JSON.parse(fs.readFileSync(IDL, "utf8"));
const idlProgramId = idl.address;

console.log("=== PAPA MAINNET RELEASE IDENTITY CHECK ===");
console.log("Expected:   ", EXPECTED_MAINNET_PROGRAM_ID);

console.log("declare_id: ", declaredProgramId);
console.log("IDL:        ", idlProgramId);
console.log();

if (declaredProgramId !== EXPECTED_MAINNET_PROGRAM_ID) {
  fail("declare_id! does not match expected Mainnet Program ID");
}

if (idlProgramId !== EXPECTED_MAINNET_PROGRAM_ID) {
  fail("IDL address does not match expected Mainnet Program ID");
}

const config = fs.readFileSync("Anchor.toml", "utf8");
const productionSection = config.split("[programs.mainnet]")[1]?.split("[")[0];
if (!productionSection?.includes(`popecoin_vesting = "${EXPECTED_MAINNET_PROGRAM_ID}"`)) {
  fail("Anchor.toml production identity does not match expected Program ID");
}
const binary = fs.readFileSync("target/deploy/popecoin_vesting.so");
if (!binary.includes(new PublicKey(EXPECTED_MAINNET_PROGRAM_ID).toBuffer())) {
  fail("Binary does not contain the expected release identity; rebuild with npm run build:safe");
}
const recordPath = "target/release-build-record.json";
if (!fs.existsSync(recordPath)) fail("Missing build record; run npm run build:safe");
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
for (const group of [record.sourceHashes, record.outputHashes]) {
  if (!group || typeof group !== "object" || Object.keys(group).length === 0) fail("Invalid build record");
  for (const [filename, expected] of Object.entries(group)) {
    // The generated record may only reference public build inputs and outputs.
    if (!/^(programs\/popecoin_vesting\/(src\/[\w/]+\.rs|Cargo\.toml)|Cargo\.(toml|lock)|Anchor\.toml|rust-toolchain\.toml|scripts\/build-release\.py|target\/(deploy\/popecoin_vesting\.so|idl\/popecoin_vesting\.json|types\/popecoin_vesting\.ts))$/.test(filename)) {
      fail("Unexpected path in build record");
    }
    if (!fs.existsSync(filename) || createHash("sha256").update(fs.readFileSync(filename)).digest("hex") !== expected) {
      fail(`Stale build input/output: ${filename}; run npm run build:safe`);
    }
  }
}
console.log("Binary SHA-256:", createHash("sha256").update(binary).digest("hex"));
console.log("PASS: local identities and build-record hashes match. No RPC or keypair was accessed.");
console.log("A local build record is not an independent reproducible-build attestation or deployment verification.");
