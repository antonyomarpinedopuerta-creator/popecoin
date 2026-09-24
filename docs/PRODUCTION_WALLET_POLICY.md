# PAPA Production Wallet Policy

This document defines the security policy for PAPA production wallets and authorities before any Mainnet keypairs are created.

## Core Rules

- Devnet keypairs must never be reused for Mainnet.
- No production seed phrase or private key may be committed to Git or stored in the repository.
- Production wallets must be created only after their role and custody method are defined.
- Critical authorities should use hardware-wallet or multisig custody where practical.
- No production wallet should be created merely for convenience.
- Mainnet wallet creation does not authorize token deployment, minting, liquidity funding, or spending real SOL.

## Roles To Define Before Wallet Creation

- Program upgrade authority
- Token mint authority
- Metadata update authority
- Reserve beneficiary/custody
- Founder beneficiary/custody
- Community/Airdrops operations wallet
- Development/Operations wallet
- Liquidity custody/funding wallet
- Mainnet fee payer

Each role must have an explicitly chosen custody method before its production wallet is created.

## Custody Guidance

- Program upgrade authority: prefer hardware wallet or multisig.
- Token mint authority: prefer hardware wallet or multisig until minting and distribution are complete.
- Metadata update authority: use a dedicated production signer; consider multisig if long-term mutability remains.
- Reserve beneficiary: dedicated production wallet with secure offline backup.
- Founder beneficiary: dedicated production wallet with secure offline backup.
- Community/Airdrops wallet: separate operational wallet with limited funds.
- Development/Operations wallet: separate operational wallet with limited funds.
- Liquidity wallet: separate wallet used only for liquidity-related operations.
- Fee payer: separate operational wallet funded only as needed.

Critical authorities must not share the same hot wallet unless that choice is explicitly reviewed and documented.

## Backup and Storage Rules

- Production seed phrases and private keys must never be stored in GitHub, cloud notes, chat messages, email, or screenshots.
- At least one offline backup must exist for each critical production wallet.
- Backups should be stored in physically separate secure locations.
- Never paste a seed phrase or private key into terminal history, documentation, scripts, or source code.
- Hardware wallets should be initialized and backed up offline following the manufacturer security procedure.
- Operational hot wallets should hold only the minimum funds required for their role.
- Any lost, exposed, or accidentally shared production key must be treated as compromised and replaced before launch.

## Pre-Creation Approval Checklist

Before any production wallet is created, confirm:

- The wallet role is explicitly defined.
- The custody method is chosen.
- The backup method is chosen.
- The signer will not reuse any Devnet keypair.
- The wallet will not be stored inside the repository.
- The wallet is not being created as an implicit authorization to spend real SOL.
- Critical authority design has been reviewed for hardware-wallet or multisig use.

Only after these checks are complete should a production wallet be generated.

## Proposed Production Wallet Map

This is the proposed production wallet separation before any Mainnet keys are generated.

1. Program upgrade authority — hardware wallet or multisig.
2. Token mint authority — hardware wallet or multisig until minting/distribution are complete.
3. Metadata update authority — dedicated signer or multisig.
4. Reserve beneficiary — dedicated cold-storage wallet.
5. Founder beneficiary — dedicated cold-storage wallet.
6. Community/Airdrops operations — separate limited-funds operational wallet.
7. Development/Operations — separate limited-funds operational wallet.
8. Liquidity operations — dedicated liquidity wallet.
9. Mainnet fee payer — separate operational wallet funded only as required.

No production keypair should be generated until this map is reviewed and accepted.

## Approval

The proposed production wallet map has been reviewed and accepted as the current design.

This approval does not authorize Mainnet wallet generation, token deployment, minting, liquidity funding, or spending real SOL.

## Custody Separation Decision

The current production design keeps all nine wallet roles separate.

No critical authority, beneficiary wallet, or operational wallet will share the same production key unless a later security review explicitly approves that consolidation.

This separation is intended to reduce the impact of a single compromised key and to keep operational funds isolated from critical authorities.

## Critical Authority Custody Decision

The Program upgrade authority, Token mint authority, and Metadata update authority will use hardware-wallet custody for Mainnet production.

These critical authorities must not use development JSON keypairs stored in WSL.

Hardware-wallet initialization, backup, and signing setup must be completed before any Mainnet deployment or authority assignment.

## Non-Critical Wallet Custody Decision

- Reserve beneficiary: dedicated cold-storage wallet.
- Founder beneficiary: dedicated cold-storage wallet.
- Community/Airdrops: separate limited-funds operational hot wallet.
- Development/Operations: separate limited-funds operational hot wallet.
- Liquidity: dedicated wallet used only for liquidity operations.
- Mainnet fee payer: separate hot wallet funded only with the minimum SOL required.

None of these wallets may share a production key with the critical authorities.
