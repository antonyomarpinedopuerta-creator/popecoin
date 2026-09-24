# PAPA Mint Authority Policy

## Fixed Supply

PAPA is designed with a maximum supply of exactly 10,000,000 PAPA.

The production mint will use 6 decimals.

No additional supply is intended after the initial Mainnet minting and distribution process is complete.

## Initial Mainnet Policy

The mint authority must remain active temporarily during the controlled Mainnet setup process.

Before revoking the mint authority:

1. Create and verify the final Mainnet PAPA mint.
2. Confirm decimals = 6.
3. Mint exactly 10,000,000 PAPA.
4. Verify total supply on-chain.
5. Complete the intended token distribution.
6. Verify all allocation balances.
7. Configure and verify Reserve and Founder vesting.
8. Verify vesting deposits and vault balances.
9. Verify final production metadata.
10. Confirm that no additional minting is required.

## Final Policy

After all required Mainnet checks pass, the PAPA mint authority is intended to be permanently revoked.

After revocation:

- No additional PAPA can be minted.
- The maximum supply remains 10,000,000 PAPA.
- Mint-authority revocation is irreversible.

## Freeze Authority

The final PAPA Mainnet mint is intended to have no freeze authority.

## Safety

Mint-authority revocation must never be executed merely because this policy exists.

Immediately before revocation:

- Verify the Mainnet cluster.
- Verify the exact PAPA mint address.
- Verify total supply.
- Verify distribution.
- Verify vesting deposits.
- Verify metadata.
- Verify current mint authority.
- Record the transaction signature.
- Confirm on-chain that mint authority is absent after the transaction.

No Mainnet minting, authority revocation, or real-SOL transaction is authorized by this document.
