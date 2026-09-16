# POPECOIN ($POPE) — Mainnet Security Checklist

This document defines the checks that must be completed before POPECOIN is considered ready for a Mainnet launch.

## 1. Contract
- [ ] Final vesting program code reviewed
- [ ] All automated tests pass
- [ ] Reserve vesting behavior verified
- [ ] Founder vesting behavior verified
- [ ] Unauthorized release attempts rejected
- [ ] Double release rejected
- [ ] Invalid schedules rejected
- [ ] No unintended withdrawal or recovery mechanism
- [ ] Independent security review completed before meaningful real value is locked

## 2. Production Wallets
- [ ] Create new Mainnet wallets
- [ ] Do NOT reuse Devnet keypairs
- [ ] Secure backups created offline
- [ ] No seed phrase or private key stored in GitHub
- [ ] Consider hardware wallet or multisig for important authorities

## 3. Mainnet Token
- [ ] Create new Mainnet POPE mint
- [ ] Decimals = 6
- [ ] Mint exactly 10,000,000 POPE
- [ ] Verify total supply on-chain
- [ ] Freeze authority absent

## 4. Distribution
- [ ] Liquidity: 4,000,000 POPE
- [ ] Reserve: 3,000,000 POPE
- [ ] Community / Airdrops: 1,500,000 POPE
- [ ] Founder: 1,000,000 POPE
- [ ] Development / Operations: 500,000 POPE
- [ ] Verify that all allocations total exactly 10,000,000 POPE

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
- [ ] Final name: POPECOIN
- [ ] Final symbol: POPE
- [ ] Final logo reviewed
- [ ] Final disclaimer reviewed
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

The current POPECOIN mint, wallets and tokens used during development are Devnet test assets.

They must not be treated as production wallets or reused as the final Mainnet deployment.
