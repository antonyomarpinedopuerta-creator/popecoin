import { loadDevnetKeypair } from "./devnet-config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  percentAmount,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  mplTokenMetadata,
  createV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";

const RPC = "https://api.devnet.solana.com";
const MINT = publicKey("ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw");

const URI =
  "https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/metadata.json";

async function main() {
  const umi = createUmi(RPC).use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(
    loadDevnetKeypair("PAYER").secretKey
  );

  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log("Creating PAPA metadata on Devnet...");
  console.log("Mint:", MINT.toString());

  const result = await createV1(umi, {
    mint: MINT,
    authority: signer,
    payer: signer,
    updateAuthority: signer,
    name: "PAPA",
    symbol: "PAPA",
    uri: URI,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  console.log("Metadata transaction confirmed.");
  console.log("Signature:", Buffer.from(result.signature).toString("base64"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
