> HISTORICAL PAPA DOCUMENT — not the current ROBUSTO launch plan. See [ROBUSTO status](../docs/ROBUSTO_STATUS.md). Historical checkmarks are not evidence of ROBUSTO production readiness.

# PAPA Production Metadata

## Final Branding

- Name: PAPA
- Symbol: PAPA
- Logo file: `papa-logo.png`
- Logo dimensions: 1254 x 1254
- Logo SHA-256: `7be34ed33f6fd2fe52946d43a4eccfd8e41055190bbc29d46a3e285858ee55eb`

## Production Hosting

Current GitHub-hosted metadata is for development/Devnet use.

Before Mainnet launch:

- Upload the final logo to durable/content-addressed storage.
- Create the production metadata JSON using the permanent logo URI.
- Upload/pin the production metadata JSON.
- Record its permanent URI.
- Verify the downloaded logo SHA-256 matches the hash above.
- Verify name, symbol, description, image URI, and disclaimer before assigning metadata to the Mainnet mint.

Production metadata URI: PENDING
Production image URI: PENDING

No Mainnet metadata transaction is authorized by this document.

## Automated checks

`npm run check:metadata` verifies exact local branding/disclaimer, rejects duplicate
JSON keys and pins PNG bytes/dimensions. `npm run check:metadata:remote` verifies
only the fixed public Devnet URLs with no redirects and bounded downloads. Reports
are under target/metadata-{local,remote}.json. The on-chain reader additionally
checks owner, PDA, mint, discriminator and URI. None of these checks establishes
production hosting permanence; final content-addressed URIs remain pending.

## Deterministic publication preparation

1. Choose/pin the approved PNG through a reviewed external provider. Preserve its
   exact bytes and recorded SHA-256. Storage selection/payment remains a human choice.
2. Record the returned durable image URI in config/production-plan.json. Do not
   invent an identifier from the file SHA: [IPFS CIDs depend on chunking and DAG
   encoding](https://docs.ipfs.tech/concepts/content-addressing/). This PNG is
   2,246,586 bytes and must not be assumed to be a single raw block.
3. Run `npm run prepare:metadata`. It writes deterministic metadata.json and a
   manifest under target/production-metadata. Missing image URI fails closed.
   URI validation checks canonical SHA-256 raw/UnixFS IPFS identifiers or canonical
   Arweave IDs, but does NOT establish hosting availability or content provenance.
4. Publish/pin the exact generated JSON bytes. Record the durable metadata URI and
   provider receipts; retain import settings, retention policy and independent copies.
5. Retrieve both URIs using the approved provider/gateway and store the public bytes
   as target/production-metadata/downloaded-metadata.json and downloaded-logo.png.
   Run `npm run prepare:metadata -- --verify-downloads`; exact JSON bytes and logo
   hash must match. A successful byte check alone does not prove which URI supplied
   those files: the operator must retain retrieval provenance and verify availability
   from an independent gateway/provider before signing anything.
6. Approve metadata update authority and mutability policy separately. Do not revoke
   or transfer authority as a side effect of publishing files. Recheck the URI, mint,
   PDA and owner in the proposed on-chain instruction and obtain explicit approval.

The branding/disclaimer is prepared. Final hosting URIs and production transaction
approval remain pending. No upload, pin, payment or metadata transaction is performed
by either prepare:metadata mode. An incomplete/failed manifest invalidates any older
candidate left in the output directory; do not treat a leftover file as a new pass.
