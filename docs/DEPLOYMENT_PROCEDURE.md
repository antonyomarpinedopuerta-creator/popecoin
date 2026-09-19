# PAPA Safe Deployment / Upgrade Procedure

This document defines the reviewed manual procedure for future Solana program deployment or upgrade work.

It is intentionally manual. Do not convert this into an automatic deployment script without a separate review.

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

## 4. Confirm Program Identity

Verify that `Anchor.toml`, `programs/popecoin_vesting/src/lib.rs` and `target/idl/popecoin_vesting.json` all reference:

`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Verify the generated local program keypair separately with:

`solana-keygen pubkey target/deploy/popecoin_vesting-keypair.json`

The generated local keypair currently resolves to `Ei7LusW1YjHJdR2vPEWdaTobrEwQCJQ8Tff9XGnXBWSF`, so a normal `anchor deploy` must not be used blindly.

## 5. Record the Release Binary

Before deployment, record the exact binary being considered:

`ls -lh target/deploy/popecoin_vesting.so`
`sha256sum target/deploy/popecoin_vesting.so`

The current verified local SHA-256 is:

`96e35568d7da089c130f43fa28b389bfd33ebd35667558aed890cc07b6e2464d`

Do not rebuild after recording the hash unless validation and hash recording are repeated.

## 6. Confirm Current Upgrade Authority

Run:

`solana program show BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Verify the Program ID, ProgramData address and upgrade authority.

The expected current Devnet upgrade authority is:

`8X8ZV5J2W1agj7vm4UAJGCg4fZDYThGBwhSRFEzm8bwn`

Do not continue if the authority does not match the expected signer.

## 7. Reviewed Upgrade Command Form

For an upgrade to the existing Devnet program, explicitly target the intended Program ID:

`solana program deploy --program-id BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc --upgrade-authority ~/.config/solana/id.json target/deploy/popecoin_vesting.so`

This command is documentation only.

Do NOT execute it unless every previous verification has passed and the upgrade has been explicitly approved.

Do NOT add `--final`.

Do NOT revoke the upgrade authority as part of a routine deployment.

## 8. Post-Deployment Verification

After any explicitly approved deployment or upgrade, run:

`solana program show BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

Record the Program ID, ProgramData address, upgrade authority, deployed slot, data length and transaction signature.

Then re-run `yarn run check`.

## 9. Mainnet Warning

This document does not authorize a Mainnet deployment.

Mainnet requires a separate production review including secure production key management, exact release-candidate verification, independent security review, final authority policy, durable metadata, explicit production vesting timestamps, liquidity review, legal/compliance review, and explicit approval before spending real SOL.

Devnet wallets and development JSON keypairs must not be reused as production keys.
