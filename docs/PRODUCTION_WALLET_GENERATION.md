# PAPA Production Wallet Generation Procedure

This document defines the procedure that must be reviewed before any PAPA Mainnet production wallet is generated.

## Scope

This procedure applies to the nine production wallet roles defined in `PRODUCTION_WALLET_POLICY.md`.

Creating a wallet does NOT authorize:

- Mainnet deployment;
- spending real SOL;
- minting PAPA;
- providing liquidity;
- assigning authorities;
- revoking authorities.

## Mandatory Security Rules

- Never reuse a Devnet wallet or keypair.
- Never create production keypairs inside the Git repository.
- Never commit a production keypair to Git or GitHub.
- Never paste a seed phrase or private key into ChatGPT or any other chat.
- Never photograph or screenshot a recovery phrase.
- Never store a recovery phrase in email, cloud storage, digital notes, source code, terminal history, or documentation.
- Write recovery phrases by hand on paper while offline.
- Verify the handwritten backup before using the wallet.
- Public addresses may be documented; private keys and recovery phrases may not.

## Production Roles

1. Program upgrade authority
2. Token mint authority
3. Metadata update authority
4. Reserve beneficiary
5. Founder beneficiary
6. Community/Airdrops operations
7. Development/Operations
8. Liquidity operations
9. Mainnet fee payer

Each role must use a separate production wallet.

## Critical Authorities

The following are critical:

- Program upgrade authority
- Token mint authority
- Metadata update authority

The currently approved temporary custody design uses separate production signers with offline paper recovery backups.

This is temporary. Migration to stronger custody such as a hardware wallet or properly separated multisig remains required before significant real value is held.

Critical authority wallets must not be used for routine operational transactions.

## Generation Preconditions

Before generating the first production wallet:

- [ ] Repository location has been confirmed.
- [ ] Generation destination is outside the Git repository.
- [ ] No Devnet keypair will be reused.
- [ ] Offline paper and pen are available for backup.
- [ ] User understands that recovery phrases/private keys must never be pasted into chat.
- [ ] Wallet-generation command has been reviewed before execution.
- [ ] No real SOL expenditure is required merely to generate the wallets.

## Generation Procedure

For each production wallet:

1. Confirm its exact role.
2. Generate a completely new production signer outside the repository.
3. Record the recovery phrase by hand offline if the selected wallet method provides one.
4. Do not copy the recovery phrase into chat or any digital document.
5. Verify the handwritten backup locally/offline.
6. Record only the public address in the production wallet inventory.
7. Confirm that the wallet contains no real funds unless funding is explicitly approved later.
8. Continue to the next role only after the previous wallet and backup have been verified.

## Post-Generation Checks

After all nine wallets are generated:

- [ ] Nine distinct public addresses exist.
- [ ] No production private key is inside the Git repository.
- [ ] No production recovery phrase is stored digitally.
- [ ] Required offline backups have been verified.
- [ ] Critical authorities remain separate from operational wallets.
- [ ] No wallet has been funded merely because it was created.
- [ ] No Mainnet transaction has been performed without separate approval.

## Stop Conditions

Stop immediately if:

- a seed phrase or private key is accidentally exposed;
- a production key is created inside the repository;
- the role of a wallet becomes ambiguous;
- a command would reveal secret key material on screen or in terminal history;
- the generated wallet unexpectedly contains or moves real funds.

Any exposed production signer must be treated as compromised and replaced before launch.

## Current Status

This document defines a procedure only.

No production wallet, Mainnet mint, Mainnet deployment, liquidity transaction, or real-SOL expenditure is authorized by this document.
