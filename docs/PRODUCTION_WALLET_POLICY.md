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
- When a recovery phrase is generated, the current planned backup method is to write it by hand on paper while offline.
- The handwritten recovery phrase must never be photographed, scanned, uploaded, typed into chat, or copied into a digital note.
- The paper backup must be stored in a private, secure location protected from unauthorized access, loss, fire, and water where practical.
- For critical wallets, a second physically separate offline backup should be considered before meaningful real value is stored.
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

1. Program upgrade authority — separate critical-authority wallet; final custody method pending security review.
2. Token mint authority — separate critical-authority wallet; final custody method pending security review.
3. Metadata update authority — separate critical-authority wallet; final custody method pending security review.
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

Hardware-wallet custody is not currently available. Before Mainnet production, the Program upgrade authority, Token mint authority, and Metadata update authority must receive a final custody review. Hardware-wallet or multisig custody remains the preferred option for critical authorities when practical.

These critical authorities must not use development JSON keypairs stored in WSL.

Before any Mainnet deployment or authority assignment, the final custody method must be approved and secure offline backups must be prepared. Recovery phrases or private keys must never be stored in GitHub, cloud notes, screenshots, chat, or source files.

## Non-Critical Wallet Custody Decision

- Reserve beneficiary: dedicated cold-storage wallet.
- Founder beneficiary: dedicated cold-storage wallet.
- Community/Airdrops: separate limited-funds operational hot wallet.
- Development/Operations: separate limited-funds operational hot wallet.
- Liquidity: dedicated wallet used only for liquidity operations.
- Mainnet fee payer: separate hot wallet funded only with the minimum SOL required.

None of these wallets may share a production key with the critical authorities.

## Pre-Creation Status

Current production wallet status:

- [x] Production wallet roles are defined.
- [x] All nine production roles are separated.
- [x] Devnet keypairs will not be reused for Mainnet.
- [x] Production wallets must not be stored inside the Git repository.
- [x] Offline paper backup method is planned.
- [x] Wallet creation does not authorize spending real SOL.
- [x] Temporary custody method for critical authorities is approved; migration to stronger custody remains required before significant value is held.
- [x] Actual production wallets are generated.
- [x] Actual offline backups are created and verified.

Production wallet generation is complete. The nine production roles have separate keypairs with verified offline recovery backups. This does not authorize Mainnet deployment, authority assignment, token minting, liquidity funding, or spending real SOL.

## Production Wallet Generation Record

All nine production wallet roles have now been generated as separate Solana keypairs.

Each recovery phrase was independently verified by recovering the corresponding keypair and confirming that the recovered public key matched the original public key.

No recovery phrase or private key is recorded in this repository.

### Production Public Keys

- **Program Upgrade Authority:** `EDkvG9pZ7Y3V3bXJqNn3PZRYf3NjuVzsE7Yp5ZNFqPnt`
- **Token Mint Authority:** `5P3UEH9CSEuSXq1EJnUnxYaTvjGCLymStiZTEeKP7CL4`
- **Metadata Update Authority:** `ERbzfNUkT2CGHjNuBNyvZJfjgeU3ivLmdVyD6ZHcCEEy`
- **Reserve Beneficiary/Custody:** `5gzMSXq6c397QErTYoPhUFQc15ZSjtUokQ1gGND2hC1Z`
- **Founder Beneficiary/Custody:** `7qJ4uvLJtXU3inXRZxCxMswdCXn9TJJoZCaKo7y8aAZm`
- **Community/Airdrops Operations:** `56RNeYQVb8SvYg34jQVr8pBvQqhcLodhyTC2KyLrkw36`
- **Development/Operations:** `9xLgRbisSmpgmvFNP89w8Qu9KTwFjy787EtAVFtqjF6g`
- **Liquidity Operations:** `oX29y2AGB1UuYyUR6kV8J4bpwC574XQZFJM1AmRo8z3`
- **Mainnet Fee Payer:** `2JURYWgdRosKmhHa6ZzF1se75pgxPQ5PHiVoCPFikDeu`

### Verification Status

- [x] All nine production roles use separate keypairs.
- [x] All nine recovery phrases were backed up offline.
- [x] Recovery was tested for every production keypair.
- [x] Every recovered public key matched its corresponding original public key.
- [x] Production keypairs are stored outside the Git repository.
- [x] Recovery phrases and private keys are not recorded in repository documentation.
- [x] No Mainnet deployment, minting, liquidity funding, or real-SOL spending was authorized by wallet generation.

These wallets must not receive significant production value until the remaining security, deployment, authority, and launch checks are completed.
