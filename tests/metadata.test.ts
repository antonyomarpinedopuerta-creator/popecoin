import test from "node:test";
import assert from "node:assert/strict";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey, lamports, MaybeRpcAccount } from "@metaplex-foundation/umi";
import { findMetadataPda, getMetadataAccountDataSerializer, MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { inspectMetadata } from "../scripts/read-metadata";
import { DEVNET_RPC, DEVNET_MINT } from "../scripts/devnet-config";

function fixture(overrides = {}) {
  const mint = publicKey(DEVNET_MINT.toBase58());
  const [address] = findMetadataPda(createUmi(DEVNET_RPC), { mint });
  const data = getMetadataAccountDataSerializer().serialize({ updateAuthority: mint, mint, name: "PAPA", symbol: "PAPA",
    uri: "https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/metadata.json",
    sellerFeeBasisPoints: 0, creators: null, primarySaleHappened: false, isMutable: true, editionNonce: null,
    tokenStandard: null, collection: null, uses: null, collectionDetails: null, programmableConfig: null, ...overrides });
  return { exists: true as const, publicKey: address, owner: MPL_TOKEN_METADATA_PROGRAM_ID, executable: false,
    lamports: lamports(1), rentEpoch: 0n, data };
}
test("metadata reader validates public Devnet PDA and fields", () => {
  assert.equal(inspectMetadata(fixture()).name, "PAPA");
});
test("metadata reader rejects substituted owners, PDA, mint, discriminator and URI", () => {
  const account = fixture();
  const wrong = publicKey(DEVNET_MINT.toBase58());
  for (const candidate of [{ ...account, exists: false }, { ...account, owner: wrong },
    { ...account, publicKey: wrong }, { ...account, executable: true },
    { ...account, data: new Uint8Array([0]) }, fixture({ mint: MPL_TOKEN_METADATA_PROGRAM_ID }),
    fixture({ name: "fake" }), fixture({ uri: "http://127.0.0.1" })]) {
    assert.throws(() => inspectMetadata(candidate as MaybeRpcAccount));
  }
});
