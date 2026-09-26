# PAPA Safe Deployment / Upgrade Procedure

This document defines the reviewed manual procedure for future Solana program deployment or upgrade work.

It is intentionally manual. Do not convert this into an automatic deployment script without a separate review.

## Current source identity (2026-09-26)

The current source and generated release IDL declare
`AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`.
The Devnet provider in Anchor.toml does not change the ID embedded in the binary.
The procedure below describes the historical Devnet target and must not be applied
to the current production-identity binary. A Devnet upgrade requires a separately
reviewed source/build with the Devnet declare_id, followed by a fresh build, all
checks, identity verification and a new binary hash. No deployment was performed
in the 2026-09-26 local review.

`npm run verify:release` checks source/config/IDL consistency offline and records
the local binary hash. It does not open production keypairs, contact Mainnet, or
prove deployed binary correspondence. Production signer verification remains a
separate operator responsibility before any future authorized deployment.

## Critical Rule

Do NOT run a normal `anchor deploy` blindly.

The generated local program keypair currently resolves to:

`Ei7LusW1YjHJdR2vPEWdaTobrEwQCJQ8Tff9XGnXBWSF`

while the existing Devnet vesting program is:

`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

The intended Program ID must always be specified explicitly.

## 1. Confirm Network

Before any deployment or upgrade, run `solana config get` and verify the intended cluster manually.

Never assume the active RPC is correct.

## 2. Confirm Repository State

Run `git status` and `git rev-parse HEAD`.

The working tree must be clean and the exact commit must be recorded before any deployment or upgrade.

## 3. Run Full Safe Validation

Run `yarn run check`.

The safe build, Rust tests and TypeScript checks must all pass before any deployment or upgrade is considered.

## 4. Confirm Program Identity (historical Devnet build only)

Verify that `Anchor.toml`, `programs/popecoin_vesting/src/lib.rs` and `target/idl/popecoin_vesting.json` all reference:

`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Verify the generated local program keypair separately with:

`solana-keygen pubkey target/deploy/popecoin_vesting-keypair.json`

The generated local keypair currently resolves to `Ei7LusW1YjHJdR2vPEWdaTobrEwQCJQ8Tff9XGnXBWSF`, so a normal `anchor deploy` must not be used blindly.

## 5. Record the Release Binary

Before deployment, record the exact binary being considered:

`ls -lh target/deploy/popecoin_vesting.so`
`sha256sum target/deploy/popecoin_vesting.so`

The historical local SHA-256 recorded before subsequent source changes was:

`96e35568d7da089c130f43fa28b389bfd33ebd35667558aed890cc07b6e2464d`

Do not rebuild after recording the hash unless validation and hash recording are repeated.

## 6. Confirm Current Upgrade Authority

Run:

`solana --url https://api.devnet.solana.com program show BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Verify the Program ID, ProgramData address and upgrade authority.

The expected current Devnet upgrade authority is:

`8X8ZV5J2W1agj7vm4UAJGCg4fZDYThGBwhSRFEzm8bwn`

Do not continue if the authority does not match the expected signer.

## 7. Reviewed Upgrade Command Form

For an upgrade to the existing Devnet program, explicitly target the intended Program ID:

`solana --url https://api.devnet.solana.com program deploy --program-id BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc --upgrade-authority ~/.config/solana/id.json target/deploy/popecoin_vesting.so`

This command is documentation only.

Do NOT execute it unless every previous verification has passed and the upgrade has been explicitly approved.

Do NOT add `--final`.

Do NOT revoke the upgrade authority as part of a routine deployment.

## 8. Post-Deployment Verification

After any explicitly approved deployment or upgrade, run:

`solana --url https://api.devnet.solana.com program show BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Record the Program ID, ProgramData address, upgrade authority, deployed slot, data length and transaction signature.

Then re-run `yarn run check`.

## 9. Mainnet Warning

This document does not authorize a Mainnet deployment.

Mainnet requires a separate production review including secure production key management, exact release-candidate verification, independent security review, final authority policy, durable metadata, explicit production vesting timestamps, liquidity review, legal/compliance review, and explicit approval before spending real SOL.

Devnet wallets and development JSON keypairs must not be reused as production keys.

## Mainnet Program Identity

The dedicated production program keypair has been generated outside the Git repository and its offline recovery backup has been verified.

- Planned Mainnet Program ID: `AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`
- Production program keypair: stored outside the repository
- File permissions verified: `600`
- Recovery from the 24-word offline backup was tested successfully
- The recovered public key matched the original production Program ID

This Program ID is planned for Mainnet but has not yet been deployed on-chain.

Do not publish it as the deployed PAPA vesting program address until the Mainnet deployment succeeds and the deployed program is independently verified on-chain.
