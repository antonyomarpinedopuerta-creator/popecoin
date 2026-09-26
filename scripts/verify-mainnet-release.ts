import { createHash } from "crypto";
import fs from "fs";
import path from "path";

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
console.log("Binary SHA-256:", createHash("sha256").update(binary).digest("hex"));
console.log("PASS: local source/config/IDL identity matches. No RPC or keypair was accessed.");
console.log("This does not prove binary/source correspondence or deployed identity. Run npm run check first.");
