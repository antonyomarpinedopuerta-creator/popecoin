# PAPA Program Upgrade Authority Policy

## Purpose

This document defines the intended production policy for the PAPA vesting program upgrade authority.

## Initial Mainnet Policy

- The program upgrade authority must NOT be revoked during initial Mainnet deployment.
- The upgrade authority must remain separate from operational wallets.
- The upgrade authority must not use any Devnet keypair.
- The upgrade authority must not use development JSON keypairs stored in WSL.
- No seed phrase or private key may be stored in GitHub, source files, chat, cloud notes, screenshots, or email.
- The final production custody method must be approved before Mainnet deployment.

## Preferred Custody

Preferred options, in order of stronger operational security where practical:

1. Multisig authority.
2. Hardware-wallet-backed authority.
3. Dedicated offline-backed production signer as a temporary fallback only after explicit security review.

Hardware-wallet or multisig custody is not currently configured.

## Immutability Decision

The PAPA vesting program must NOT be made immutable at initial launch.

Program immutability may only be considered after:

- Mainnet deployment is verified.
- The deployed binary and reviewed release candidate are confirmed to correspond.
- Independent security review is completed.
- Vesting behavior is verified in production.
- No critical defect or required upgrade remains.
- The decision is explicitly reviewed as irreversible.

## Authority Changes

Any future transfer or revocation of the upgrade authority must:

- Be explicitly reviewed before execution.
- Verify the current Program ID.
- Verify the current upgrade authority on-chain.
- Verify the destination authority if transferring.
- Record the transaction signature.
- Confirm the resulting authority state on-chain.

No upgrade-authority transaction is authorized by this document.
