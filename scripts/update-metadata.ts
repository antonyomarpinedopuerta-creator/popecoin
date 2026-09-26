import { loadDevnetKeypair } from "./devnet-config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  mplTokenMetadata,
  updateV1,
  fetchMetadataFromSeeds,
} from "@metaplex-foundation/mpl-token-metadata";

const RPC = "https://api.devnet.solana.com";

const MINT = publicKey(
  "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
);

const URI =
  "https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/metadata.json";

async function main() {
  const umi = createUmi(RPC).use(mplTokenMetadata());

  const keypair = umi.eddsa.createKeypairFromSecretKey(
    loadDevnetKeypair("PAYER").secretKey
  );

  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  const current = await fetchMetadataFromSeeds(umi, {
    mint: MINT,
  });

  console.log("=== CURRENT METADATA ===");
  console.log("Name:", current.name);
  console.log("Symbol:", current.symbol);
  console.log("URI:", current.uri);
  console.log("Mutable:", current.isMutable);

  console.log("\n=== NEW METADATA ===");
  console.log("Name: PAPA");
  console.log("Symbol: PAPA");
  console.log("URI:", URI);

  const result = await updateV1(umi, {
    mint: MINT,
    authority: signer,
    data: {
      name: "PAPA",
      symbol: "PAPA",
      uri: URI,
      sellerFeeBasisPoints: current.sellerFeeBasisPoints,
      creators: current.creators,
    },
  }).sendAndConfirm(umi);

  console.log("\nPAPA metadata updated on Devnet.");
  console.log(
    "Signature:",
    Buffer.from(result.signature).toString("base64")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
