import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const EXPECTED_MAINNET_PROGRAM_ID =
  "AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn";

const HOME = process.env.HOME;
if (!HOME) {
  throw new Error("HOME is not defined");
}

const PROGRAM_KEYPAIR = path.join(
  HOME,
  ".papa-production",
  "mainnet-program-id.json"
);

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

if (!fs.existsSync(PROGRAM_KEYPAIR)) {
  fail(`Mainnet program keypair not found: ${PROGRAM_KEYPAIR}`);
}

const keypairPubkey = execFileSync(
  "solana-keygen",
  ["pubkey", PROGRAM_KEYPAIR],
  { encoding: "utf8" }
).trim();

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
console.log("Keypair:    ", keypairPubkey);
console.log("declare_id: ", declaredProgramId);
console.log("IDL:        ", idlProgramId);
console.log();

if (keypairPubkey !== EXPECTED_MAINNET_PROGRAM_ID) {
  fail("production program keypair does not match expected Mainnet Program ID");
}

if (declaredProgramId !== EXPECTED_MAINNET_PROGRAM_ID) {
  fail("declare_id! does not match expected Mainnet Program ID");
}

if (idlProgramId !== EXPECTED_MAINNET_PROGRAM_ID) {
  fail("IDL address does not match expected Mainnet Program ID");
}

console.log("PASS: Mainnet program identity is internally consistent.");
