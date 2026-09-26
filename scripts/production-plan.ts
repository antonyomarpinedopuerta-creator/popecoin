import fs from "fs";
import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { DEVNET_MINT } from "./devnet-config";

export const PRODUCTION_PROGRAM = new PublicKey("AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn");
export const ALLOCATIONS = [
  { role: "liquidity", tokens: 4000000n, beneficiary: "oX29y2AGB1UuYyUR6kV8J4bpwC574XQZFJM1AmRo8z3" },
  { role: "reserve", tokens: 3000000n, beneficiary: "5gzMSXq6c397QErTYoPhUFQc15ZSjtUokQ1gGND2hC1Z", cliffDays: 90 },
  { role: "community", tokens: 1500000n, beneficiary: "56RNeYQVb8SvYg34jQVr8pBvQqhcLodhyTC2KyLrkw36" },
  { role: "founder", tokens: 1000000n, beneficiary: "7qJ4uvLJtXU3inXRZxCxMswdCXn9TJJoZCaKo7y8aAZm", cliffDays: 180 },
  { role: "development", tokens: 500000n, beneficiary: "9xLgRbisSmpgmvFNP89w8Qu9KTwFjy787EtAVFtqjF6g" },
];
export function durableUri(value: unknown): string {
  if (typeof value !== "string" || !/^(ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})|ar:\/\/[A-Za-z0-9_-]{43})(\/[A-Za-z0-9._/-]+)?$/.test(value) || value.includes("..")) {
    throw new Error("A content-addressed ipfs:// or ar:// URI is required");
  }
  return value;
}
export function preparePlan(input: { mint: unknown; startUtc: unknown; imageUri: unknown; metadataUri: unknown }) {
  if (typeof input.mint !== "string" || typeof input.startUtc !== "string") throw new Error("Final mint and approved startUtc are pending");
  const mint = new PublicKey(input.mint);
  if (mint.equals(DEVNET_MINT) || mint.equals(PublicKey.default)) throw new Error("Production mint must not be the Devnet or default address");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(input.startUtc)) throw new Error("startUtc must be explicit UTC: YYYY-MM-DDTHH:mm:ssZ");
  const milliseconds = Date.parse(input.startUtc);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().replace(".000Z", "Z") !== input.startUtc) throw new Error("Invalid UTC date");
  const start = milliseconds / 1000;
  if (!Number.isSafeInteger(start) || start < 0) throw new Error("Invalid production timestamp");
  const imageUri = durableUri(input.imageUri), metadataUri = durableUri(input.metadataUri);
  const allocations = ALLOCATIONS.map(allocation => {
    const beneficiary = new PublicKey(allocation.beneficiary);
    const amount = (allocation.tokens * 1000000n).toString();
    const ata = getAssociatedTokenAddressSync(mint, beneficiary).toBase58();
    if (allocation.cliffDays === undefined) return { role: allocation.role, beneficiary: beneficiary.toBase58(), amount, ata };
    const [vesting] = PublicKey.findProgramAddressSync([Buffer.from("vesting"), beneficiary.toBuffer(), mint.toBuffer()], PRODUCTION_PROGRAM);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), vesting.toBuffer()], PRODUCTION_PROGRAM);
    const cliff = start + allocation.cliffDays * 86400, end = start + 730 * 86400;
    return { role: allocation.role, beneficiary: beneficiary.toBase58(), amount, ata, vesting: vesting.toBase58(), vault: vault.toBase58(),
      start, cliff, end, cliffUtc: new Date(cliff * 1000).toISOString(), endUtc: new Date(end * 1000).toISOString() };
  });
  return { status: "OFFLINE PLAN ONLY — NOT AUTHORIZED FOR EXECUTION", program: PRODUCTION_PROGRAM.toBase58(), mint: mint.toBase58(),
    decimals: 6, supply: "10000000000000", startUtc: input.startUtc, imageUri, metadataUri, allocations };
}
export function verifyLocalMetadata() {
  const metadata = JSON.parse(fs.readFileSync("metadata/metadata.json", "utf8"));
  if (metadata.name !== "PAPA" || metadata.symbol !== "PAPA" || !metadata.description.includes("not affiliated")) throw new Error("Unexpected branding or missing disclaimer");
  const image = fs.readFileSync("metadata/papa-logo.png");
  const sha256 = createHash("sha256").update(image).digest("hex");
  if (sha256 !== "7be34ed33f6fd2fe52946d43a4eccfd8e41055190bbc29d46a3e285858ee55eb") throw new Error("Logo hash mismatch");
  return { name: metadata.name, symbol: metadata.symbol, description: metadata.description, logoSha256: sha256 };
}
if (require.main === module) {
  try {
    const branding = verifyLocalMetadata();
    const plan = preparePlan(JSON.parse(fs.readFileSync(process.argv[2] ?? "config/production-plan.json", "utf8")));
    console.log(JSON.stringify({ ...plan, metadata: { name: branding.name, symbol: branding.symbol, description: branding.description, image: plan.imageUri }, logoSha256: branding.logoSha256 }, null, 2));
  } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
