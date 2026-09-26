# PAPA Mainnet Vesting Plan

## Status

Planning document only.

No Mainnet vesting account, wallet, transaction, or token allocation is created or authorized by this document.

Exact production timestamps remain pending until the Mainnet launch date is explicitly approved.

## Reserve Vesting

- Allocation: 3,000,000 PAPA
- Duration: 730 days
- Cliff: 90 days
- Release: linear
- Accrual begins at the approved start timestamp
- Claims are blocked until the cliff timestamp
- No early withdrawal or cancellation mechanism

Production timestamps:

- `start_time`: PENDING
- `cliff_time`: `start_time + 90 days`
- `end_time`: `start_time + 730 days`

## Founder Vesting

- Allocation: 1,000,000 PAPA
- Duration: 730 days
- Cliff: 180 days
- Release: linear
- Accrual begins at the approved start timestamp
- Claims are blocked until the cliff timestamp
- No early withdrawal or cancellation mechanism

Production timestamps:

- `start_time`: PENDING
- `cliff_time`: `start_time + 180 days`
- `end_time`: `start_time + 730 days`

## Production Rules

- Do not use `Date.now()` or an unreviewed local clock to define production vesting timestamps.
- Use explicit Unix timestamps reviewed before signing Mainnet transactions.
- Record the human-readable UTC date corresponding to every production timestamp.
- Verify beneficiary addresses before initialization.
- Verify mint address before initialization.
- Verify the Reserve amount is exactly 3,000,000 PAPA.
- Verify the Founder amount is exactly 1,000,000 PAPA.
- Verify the resulting vesting PDAs and vaults on-chain.
- Do not deposit production tokens until all parameters have been independently checked.

## Final Approval Required

Before Mainnet initialization, record and review:

- Reserve beneficiary address: `5gzMSXq6c397QErTYoPhUFQc15ZSjtUokQ1gGND2hC1Z` (verified)
- Founder beneficiary address: `7qJ4uvLJtXU3inXRZxCxMswdCXn9TJJoZCaKo7y8aAZm` (verified)
- Mainnet PAPA mint address: PENDING
- Approved start date and time
- Reserve start, cliff, and end Unix timestamps
- Founder start, cliff, and end Unix timestamps
- Expected PDAs and vaults

Until those values are explicitly approved, Mainnet vesting initialization remains blocked.
