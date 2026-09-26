import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import {
  mplTokenMetadata,
  fetchMetadataFromSeeds,
} from "@metaplex-foundation/mpl-token-metadata";

async function main() {
  const umi = createUmi("https://api.devnet.solana.com")
    .use(mplTokenMetadata());

  const mint = publicKey(
    "ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw"
  );

  const metadata = await fetchMetadataFromSeeds(umi, { mint });

  console.log("Name:", metadata.name);
  console.log("Symbol:", metadata.symbol);
  console.log("URI:", metadata.uri);
  console.log("Mutable:", metadata.isMutable);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
