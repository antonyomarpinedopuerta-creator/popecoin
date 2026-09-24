# PAPA Critical Authority Custody Plan

## Scope

This plan applies to:

- Program upgrade authority
- Token mint authority
- Metadata update authority

No production keypair is created by this document.

## Current Constraints

- Hardware-wallet custody is not currently available.
- A production multisig is not currently configured.
- The project currently has one primary operator.
- Creating multiple signer keys on the same computer would not provide meaningful multisig security.

## Temporary Production Custody Plan

Until hardware-wallet or properly separated multisig custody is available:

- Each critical authority must use a separate production keypair.
- No Devnet keypair may be reused.
- Critical authority keys must not be stored inside the Git repository.
- Critical authority keys must not be committed to GitHub.
- Recovery phrases must be backed up offline by hand on paper.
- Recovery phrases must never be photographed, uploaded, emailed, stored in cloud notes, or sent through chat.
- Critical-authority signers must not be used as routine operational wallets.
- Operational wallets must remain separate.

## Authority Lifecycle

### Token Mint Authority

Temporary only.

It remains active during controlled Mainnet setup and is intended to be permanently revoked after:

- exactly 10,000,000 PAPA are minted;
- distribution is verified;
- vesting deposits are verified;
- metadata is verified;
- all relevant Mainnet checklist items pass.

### Program Upgrade Authority

Longer-lived.

It remains active at launch so critical bugs can be corrected.

It must not be revoked until:

- independent security review is complete;
- reviewed source and deployed binary correspondence is established;
- Mainnet behavior is verified;
- the project explicitly approves an irreversible immutability decision.

### Metadata Update Authority

Temporary or longer-lived depending on the final metadata immutability decision.

Its authority must remain separated from operational wallets.

## Future Security Upgrade

Before significant value is held by PAPA, the project should migrate long-lived critical authority custody to one of:

1. A properly configured multisig with signers on genuinely separate devices or custody locations.
2. Hardware-wallet-backed custody.
3. Another independently reviewed secure custody architecture.

## Pre-Creation Gate

Critical production wallets must not be generated until:

- this custody plan is reviewed;
- the offline backup procedure is accepted;
- the operator understands that no seed phrase or private key may be shared in chat;
- the wallet-generation procedure is reviewed before execution.

This document does not authorize Mainnet deployment, wallet generation, minting, liquidity funding, or spending real SOL.
