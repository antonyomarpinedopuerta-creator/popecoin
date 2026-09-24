# PAPA ($PAPA) — Mainnet Security Checklist

This document defines the checks that must be completed before PAPA is considered ready for a Mainnet launch.

## 1. Contract
- [x] Final vesting program code reviewed
- [x] All automated tests pass
- [x] Reserve vesting behavior verified
- [x] Founder vesting behavior verified
- [x] Unauthorized release attempts rejected
- [x] Double release rejected
- [x] Invalid schedules rejected
- [x] No unintended withdrawal or recovery mechanism
- [ ] Independent security review completed before meaningful real value is locked
- [x] Verify the deployment Program ID and program keypair before any deployment
- [ ] Do NOT use a normal `anchor deploy` blindly: the current generated `target/deploy/popecoin_vesting-keypair.json` resolves to `Ei7LusW1YjHJdR2vPEWdaTobrEwQCJQ8Tff9XGnXBWSF`, while the existing Devnet vesting program is `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`
- [x] Use the reviewed deployment/upgrade procedure that explicitly targets the intended Program ID

## 2. Production Wallets
- [ ] Create new Mainnet wallets
- [ ] Do NOT reuse Devnet keypairs
- [ ] Secure backups created offline
- [ ] No seed phrase or private key stored in GitHub
- [ ] Consider hardware wallet or multisig for important authorities

## 3. Mainnet Token
- [ ] Create new Mainnet PAPA mint
- [ ] Decimals = 6
- [ ] Mint exactly 10,000,000 PAPA
- [ ] Verify total supply on-chain
- [ ] Freeze authority absent

## 4. Distribution
- [ ] Liquidity: 4,000,000 PAPA
- [ ] Reserve: 3,000,000 PAPA
- [ ] Community / Airdrops: 1,500,000 PAPA
- [ ] Founder: 1,000,000 PAPA
- [ ] Development / Operations: 500,000 PAPA
- [ ] Verify that all allocations total exactly 10,000,000 PAPA

## 5. Vesting
- [ ] Reserve: 730-day schedule with 90-day cliff
- [ ] Founder: 730-day schedule with 180-day cliff
- [ ] Verify vesting PDAs and vaults
- [ ] Verify beneficiaries
- [ ] Verify deposited amounts
- [ ] Verify release rules before locking Mainnet allocations

## 6. Mint Authority
- [ ] Complete minting and distribution first
- [ ] Verify all token balances
- [ ] Verify vesting deposits
- [ ] Verify metadata
- [ ] Revoke mint authority only after every previous check passes
- [ ] Confirm on-chain that mint authority is permanently absent

Mint authority revocation is irreversible.

## 7. Program Upgrade Authority
- [ ] Decide final upgrade policy
- [ ] Consider multisig/governance for upgrade authority
- [ ] Do not revoke upgrade authority during development
- [ ] If making the program immutable, do so only after final review

Program immutability is an important and potentially irreversible security decision.

## 8. Metadata
- [x] Final name: PAPA
- [x] Final symbol: PAPA
- [x] Final logo reviewed
- [x] Final disclaimer reviewed
- [ ] Move production metadata to durable/immutable hosting
- [ ] Pin both metadata JSON and image
- [ ] Verify metadata on-chain
- [ ] Decide whether metadata should become immutable

## 9. Transparency
- [ ] Publish tokenomics
- [ ] Publish mint address
- [ ] Publish vesting program address
- [ ] Publish relevant vesting addresses
- [ ] Clearly disclose Reserve and Founder vesting
- [ ] Do not claim guaranteed price appreciation or returns
- [ ] Do not create fake volume or deceptive trading activity
- [ ] Do not imply affiliation with the Vatican, Holy See, or any real Pope

## 10. Launch
- [ ] Complete security review
- [ ] Confirm production wallet security
- [ ] Confirm final supply and authorities
- [ ] Confirm liquidity strategy
- [ ] Review applicable legal/compliance requirements
- [ ] Only then consider Mainnet deployment and DEX liquidity

## Important

The current PAPA mint, wallets and tokens used during development are Devnet test assets.

They must not be treated as production wallets or reused as the final Mainnet deployment.
