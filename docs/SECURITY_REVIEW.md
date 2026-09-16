# POPECOIN Vesting — Security Review

**Project:** POPECOIN ($POPE)  
**Network reviewed:** Solana Devnet  
**Program ID:** `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

> This document records an internal security review of the POPECOIN vesting program.
> It is not an independent professional security audit.

## 1. Scope

The review covers the `initialize`, `deposit`, and `release` instructions.

The review focuses on authorization, PDA validation, token-account validation,
vesting schedules, arithmetic safety, unauthorized operations, repeated deposits,
vault pre-funding and initialization griefing.

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

**Status: FIXED**

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

- `vault_amount <= total_amount`
- `released_amount == 0`
- checked arithmetic is used

A regression test pre-funds the vault with one base unit and verifies that the
official deposit can still complete the intended vesting balance.

**Status: FIXED FOR PARTIAL PRE-FUNDING**

## 4. Full or excess unsolicited funding

If the vault already contains exactly the complete vesting amount, the current
deposit instruction rejects another deposit because the remaining amount is zero.

The scheduled tokens are already present in the program-controlled vault, but
this scenario should receive an explicit regression test before Mainnet.

If unsolicited tokens cause the vault balance to exceed the configured vesting
total, the deposit instruction rejects the operation.

Tokens transferred to the vault beyond the scheduled amount could potentially
remain there because the program intentionally has no administrator recovery or
arbitrary withdrawal instruction.

**Status: ADDITIONAL TESTING REQUIRED BEFORE MAINNET**

## 5. Authorization and release controls

Current protections include:

- authority signature required for deposits;
- beneficiary signature required for initialization;
- beneficiary signature required for releases;
- vesting PDA validation;
- vault PDA validation;
- mint validation;
- source token-account owner and mint validation;
- destination token-account owner and mint validation;
- checked arithmetic;
- tracking of previously released tokens.

The release logic has been tested for unauthorized access, release before cliff,
partial release, final release and attempts to release again after completion.

**Status: TESTED**

## 6. Vesting schedule validation

Initialization rejects invalid schedules including:

- zero total amount;
- start time greater than or equal to end time;
- cliff before start;
- cliff after end.

Current vesting semantics:

- accrual begins at `start_time`;
- nothing is claimable before `cliff_time`;
- at the cliff, the amount accrued since `start_time` becomes claimable;
- vesting continues linearly until `end_time`.

**Status: TESTED**

## 7. Automated tests

After the security changes, the current automated test suite completed with:

- Integration tests: 5 passed
- Program-load tests: 1 passed
- Vesting-math tests: 5 passed
- Total: 11 passed
- Failures: 0

The project also successfully passed:

- `anchor build`
- `cargo test`
- `npx tsc --noEmit`

## 8. Devnet deployment

The hardened version was deployed as an upgrade to the existing Devnet program.

**Program ID:**

`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`

**Upgrade transaction:**

`5ioFXUe93KvWj76q8XMrbTYfmAfPWoUj7ydfxVdfhsrM13qeVkN8vrdXcDHwktbjSMSQHyRBFC5euLas4nkFzFp5`

**ProgramData:**

`BgN29LQE57gAB7UVTRUkczfQYnvXXFd37bsB8yCJqC6U`

The upgrade authority remains active during development.

It must not be revoked until final testing, review and authority-management
decisions are complete.

## 9. Mainnet blockers

This internal review does NOT declare POPECOIN ready for Mainnet.

Before Mainnet:

1. Test full unsolicited vault funding.
2. Test behavior when the vault exceeds the scheduled amount.
3. Run the complete test suite after final changes.
4. Use secure production wallet/key management.
5. Review multisig and authority architecture.
6. Decide the final program upgrade-authority policy.
7. Decide the final mint-authority policy.
8. Move metadata to durable/content-addressed storage.
9. Verify final token distribution and vesting timestamps.
10. Review liquidity-launch procedures.
11. Obtain an independent security review before significant real funds are used.
12. Review applicable legal, tax and disclosure requirements.

## 10. Security principles

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

Two important griefing risks were identified during the internal review:

1. unauthorized initialization of a beneficiary vesting PDA;
2. denial of the legitimate deposit through partial vault pre-funding.

Both have been mitigated in the current Devnet implementation.

The hardened implementation passes the current automated test suite, but
additional adversarial testing and an independent review remain recommended
before a Mainnet launch involving real economic value.
