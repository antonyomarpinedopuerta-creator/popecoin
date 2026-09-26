# PAPA Vesting — Security Review

**Project:** PAPA ($PAPA)  
**Network reviewed:** Solana Devnet  
**Program ID:** `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

> This document records an internal security review of the PAPA vesting program.
> It is not an independent professional security audit.

## 1. Scope

The review covers the complete current vesting program, including:

- `initialize`
- `deposit`
- `release`
- vesting state
- PDA seeds
- program errors
- exposed program instructions

The review focuses on authorization, PDA validation, token-account validation,
vesting schedules, arithmetic safety, unauthorized operations, repeated deposits,
vault pre-funding, initialization griefing and release authorization.

The current program exposes only three instructions: `initialize`, `deposit`
and `release`.

There is no administrator instruction for arbitrary withdrawal, cancellation,
beneficiary replacement or recovery of tokens from a vesting vault.

## 2. Initialization griefing

### Original behavior

The original `Initialize` instruction accepted the beneficiary without requiring
the beneficiary to sign.

Because the vesting PDA is derived from the beneficiary and mint, this could allow
an unwanted initialization of the unique vesting PDA before the intended
beneficiary initialized it.

### Fix

The beneficiary is now:

`Signer<'info>`

Therefore, creation of the vesting account requires authorization from the
beneficiary.

A regression test verifies the current initialization behavior.

**Status: FIXED AND TESTED**

## 3. Vault pre-funding griefing

### Original behavior

The original deposit logic required the vault balance to be exactly zero.

Because a standard SPL token account can receive tokens from external accounts,
someone could send a small amount of the same token to the vault before the
official deposit.

That could prevent the legitimate deposit from succeeding.

### Fix

The program now calculates:

`remaining_amount = total_amount - vault_amount`

The authorized depositor must deposit exactly the remaining amount.

The program also verifies:

- `released_amount == 0`
- `vault_amount <= total_amount`
- the requested deposit equals the exact remaining amount
- checked arithmetic is used

Partial pre-funding is therefore accounted for instead of requiring an empty vault.

**Status: FIXED AND TESTED**

## 4. Full or excess unsolicited funding

Explicit regression tests now cover both important boundary conditions.

### Vault already funded with exactly the scheduled total

If the vault already contains exactly `total_amount`, another `deposit` call is
rejected because the remaining amount is zero.

The scheduled tokens are already held by the program-controlled vault.

### Vault funded beyond the scheduled total

If the vault balance exceeds `total_amount`, `deposit` rejects the operation.

Because the program intentionally contains no administrator recovery or arbitrary
withdrawal instruction, unsolicited tokens beyond the scheduled amount can remain
in the vault.

This is a known design consideration rather than an administrator-controlled
recovery feature.

**Status: DEPOSIT BEHAVIOR TESTED; EXCESS-TOKEN RECOVERY NOT IMPLEMENTED BY DESIGN**

## 5. Deposit authorization and validation

The deposit path verifies:

- the configured authority signs;
- the vesting PDA is valid;
- the vesting mint matches;
- the vault PDA is valid;
- the vault belongs to the vesting PDA;
- the source token account belongs to the authority;
- the source token account uses the correct mint;
- no scheduled release has already occurred;
- the vault does not exceed the configured total;
- the deposit equals the exact remaining amount.

Explicit tests verify rejection of:

- unauthorized deposit authority;
- wrong authority-token-account owner;
- deposit below the required amount;
- deposit above the required amount;
- full pre-funded vault;
- excess pre-funded vault.

**Status: TESTED**

## 6. Release authorization and accounting

The release path verifies:

- the beneficiary signs;
- the signer matches the stored beneficiary;
- the vesting PDA is valid;
- the vault PDA is valid;
- the mint matches the stored mint;
- the vault belongs to the vesting PDA;
- the destination token account belongs to the beneficiary;
- the destination token account uses the correct mint;
- previously released tokens are tracked;
- checked arithmetic is used.

Explicit tests cover:

- unauthorized beneficiary;
- destination owned by the wrong user;
- authorized beneficiary;
- release at the exact cliff;
- partial release;
- repeated release at the same timestamp;
- final release.

**Status: TESTED**

## 7. Vesting schedule validation

Initialization rejects invalid schedules including:

- zero total amount;
- start time greater than or equal to end time;
- cliff before start;
- cliff after end.

Current vesting semantics:

- accrual begins at `start_time`;
- nothing is claimable before `cliff_time`;
- at exactly `cliff_time`, the amount accrued since `start_time` becomes claimable;
- vesting continues linearly until `end_time`;
- at or after `end_time`, the full scheduled amount is vested.

The exact-cliff behavior has an explicit regression test.

**Status: TESTED**

## 8. Automated tests

The current complete local Rust test suite completed successfully with:

- Integration tests: 17 passed
- Program-load tests: 1 passed
- Vesting-math tests: 5 passed
- Total: 23 passed
- Failures: 0

The latest complete run also passed:

- `cargo test`
- `git diff --check`

Previous development checks have also successfully passed:

- `anchor build`
- `npx tsc --noEmit`

The successful test suite materially increases confidence in the tested behavior,
but it does not prove the absence of all vulnerabilities.

## 9. Devnet deployment

The hardened version was deployed as an upgrade to the existing Devnet program.

**Program ID:**

`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

**Upgrade transaction:**

`5ioFXUe93KvWj76q8XMrbTYfmAfPWoUj7ydfxVdfhsrM13qeVkN8vrdXcDHwktbjSMSQHyRBFC5euLas4nkFzFp5`

**ProgramData:**

`BgN29LQE57gAB7UVTRUkczfQYnvXXFd37bsB8yCJqC6U`

The upgrade authority remains active during development.

It must not be revoked until final testing, independent review and
authority-management decisions are complete.

## 10. Known design limitations

The current design intentionally has several properties that should remain
documented:

1. There is one vesting PDA per beneficiary and mint because the PDA seeds are
   beneficiary + mint. Multiple independent vesting tranches for the same
   beneficiary and mint would require a schedule identifier or a different PDA
   design.

2. The cliff does not reset linear accrual. Accrual starts at `start_time`, and
   the amount accumulated since the start becomes claimable when the cliff is
   reached.

3. Standard SPL token accounts can receive unsolicited tokens.

4. Tokens sent to a vault beyond its scheduled vesting total do not have an
   administrator recovery path in the current design.

5. The program currently remains upgradeable while development and review are
   ongoing.

These behaviors should be considered when defining the final Mainnet architecture.

## 11. Mainnet blockers

This internal review does NOT declare PAPA ready for Mainnet.

Before significant real economic value is placed under the program:

1. Run final `anchor build`, Rust tests and TypeScript checks from the exact
   release candidate.
2. Verify that the deployed binary corresponds to the reviewed source/release.
3. Use secure production wallet/key management rather than development JSON
   keypairs.
4. Review multisig and authority architecture.
5. Decide the final program upgrade-authority policy.
6. Decide the final mint-authority policy.
7. Move metadata and image assets to durable/content-addressed storage.
8. Verify final token distribution and explicit production vesting timestamps.
9. Review liquidity-launch procedures.
10. Obtain an independent security review before significant real funds are used.
11. Review applicable legal, tax and disclosure requirements.
12. Re-run the complete security checklist immediately before irreversible
    authority changes.

## 12. Security principles

The project should continue to follow these principles:

- no hidden minting;
- no hidden withdrawal mechanism;
- no honeypot behavior;
- no arbitrary seizure of user tokens;
- no fake volume or wash trading;
- transparent token allocation;
- transparent vesting schedules;
- deterministic PDA validation;
- least-privilege authorities;
- irreversible authority changes only after final verification.

## Conclusion

Two important griefing risks were identified during development:

1. unauthorized initialization of a beneficiary vesting PDA;
2. denial of the legitimate deposit through partial vault pre-funding.

Both were mitigated in the current implementation.

Additional adversarial tests now cover authorization failures, invalid deposit
amounts, full and excess vault pre-funding, destination ownership, exact-cliff
behavior, partial release, repeated release and final release.

The current local suite passes 23 tests with zero failures.

This is an internal engineering security review, not proof that the program is
free of vulnerabilities and not a substitute for an independent professional
audit before significant Mainnet funds are placed under the program.

## 13. Release Candidate Verification Record

A local release-candidate verification was completed on 2026-09-25 against Git commit:

`a5f4474af4a9012124be421cd5bb1f46498a9e66`

The repository was clean before and after verification.

The following command completed successfully:

`npm run check`

Results:

- Anchor release build completed successfully with `anchor build --ignore-keys`.
- Rust integration tests: 17 passed, 0 failed.
- Program-load test: 1 passed, 0 failed.
- Vesting tests: 5 passed, 0 failed.
- Total functional Rust tests: 23 passed, 0 failed.
- TypeScript static check completed successfully with `tsc --noEmit`.

This verification does not constitute an independent security audit and does not authorize Mainnet deployment or the use of significant real economic value.
