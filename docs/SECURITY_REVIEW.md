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

## 8. Historical automated tests (superseded by section 14)

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

That historical local suite passed 23 tests; current evidence is in the handoff.

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

## 14. Local source review — 2026-09-26

The historical counts and Devnet deployment above do not describe the new local
candidate. See `PAPA_WORK_HANDOFF.md` for current validation and remaining gates.
No deployed state was queried or changed during this review.

Fixed: valid schedules spanning more than i64::MAX seconds previously initialized
successfully but failed mid-schedule release with ArithmeticOverflow. Timestamp
subtraction now widens to i128 before subtraction; elapsed and duration fit u64,
and multiplication by the u64 total fits u128. The stored account layout, PDA seeds,
instruction ABI, rounding direction and ordinary schedule semantics are unchanged.
The production calculation is shared with math tests instead of duplicating it.

Added SBF regressions for a full i64 schedule, missing beneficiary signer, equal
start/end rejection, and failed token CPI rollback followed by successful funding
and release. Added math boundary/monotonicity tests and offline TypeScript tests
for the generated IDL, Devnet PDAs, required signer and exact deposit top-ups.

Devnet scripts previously trusted the production address in the generated IDL.
They now bind explicitly to the historical Devnet address. Signer paths must be
explicit Devnet-role environment variables; no default CLI wallet is loaded.
The local release verifier no longer reads a production keypair.

Additional limitations: the program accepts any classic SPL mint, does not itself
cap mint supply, and cannot prevent a mint freeze authority from freezing a vault.
Production mint/supply/freeze checks remain an operational launch requirement.
A partially funded vesting can release if the vault covers the accrued claim;
after such a release, deposit is disabled, though direct SPL transfers can still
fund the vault. Underfunding is not a cancellation mechanism. A local read-only Devnet frontend exists in `app/`; production signing is not implemented.


## 15. Continuation from f46fde9 — 2026-09-26

No on-chain ABI, seeds, account layout or program authority powers changed in this
continuation. Four new SBF tests cover backwards clock rollback/recovery, frozen
SPL accounts and recovery, partial direct funding followed by deposit rejection
and direct completion, and rejection of funded-account reinitialization. Failed
operations assert expected errors and unchanged state/token balances.

The initial safe check failed with DeclaredProgramIdMismatch: Devnet and release
shared build caches. Builds now use explicit manifest/output paths and separate
Devnet caches. Both identity suites pass; release verification checks a local
build record and identity bytes as an additional stale-artifact guard.

The frontend reader rejects malformed SPL layouts, executable data accounts,
uninitialized mints, invalid token states and unexpected vault delegates/close
powers. Its coverage indicator is not a transaction-executability claim.
Malformed HTTP request targets return controlled errors. No signing UI was added.

See DEPENDENCY_REVIEW.md for the native bigint-buffer mitigation and outstanding
upstream advisories. ProgramData read-only verification on 2026-09-26 matches the
historical executable hash, not this local candidate. No deployment was performed.

## 16. Recovery and RC evidence hardening — 2026-09-26

The recovered working tree was already committed at bc319b1. Release validation
now rejects incomplete input/output hash sets, added Rust sources and malformed
hashes. Devnet mint decoding additionally rejects noncanonical initialization and
COption flags before presenting data. The combined RC command passes 41 Rust
tests per identity, 23 client tests and nine Python runner tests, plus TypeScript,
Anchor IDL generation and Clippy. The runner invalidates stale success before Git
inspection, rejects concurrent runs and changed public inputs, and stops its child
process group on SIGTERM/SIGINT. Real SIGTERM behavior is tested with a synthetic
child; no wallets or network transactions are involved. Abrupt power loss cannot
be reported as a completed run. This evidence remains local and is not an audit.

## 17. Reproducible candidate and additional adversarial cases

Current totals supersede previous counts: 45 Rust tests per identity (35 SBF
integration, one program load, nine arithmetic), 23 client tests, and 17 Python
fault/reproduction/package tests. New SBF cases reject absent initialize authority
and rent-payer signatures, substituted deposit accounts, and duplicate releases
in a single transaction with full rollback. A u64::MAX mint across the entire i64
timestamp interval conserves every token unit through intermediate/final claims.
No program instruction, layout, authority power or ABI changed in this continuation.

A fresh workspace with independent build caches reproduces identical SBF, IDL and
TypeScript artifacts and passes the Rust suite. Local package validation rejects
dirty or changed HEADs, missing checks, stale sources/artifacts and incomplete
reproduction evidence. Synthetic adjacent keypair-named marker files are not
included in archives. Actual SIGKILL leaves an incomplete report; unlike SIGTERM,
it cannot reap child processes. This remains internal engineering evidence.

Browser checks exercised reserve/founder reads, mobile layout, and simulated RPC
failure recovery. Production mint, UTC start and durable metadata/image URIs are
still deliberately unset. No production readiness or independent audit is claimed.

Clippy now covers all targets, including test code, with warnings denied. Two
preexisting unnecessary instruction clones in tests were replaced by borrowed
slices; no program behavior changed.

## 18. Complete source re-review — 2026-09-27

Re-read all three instruction handlers, account constraints, state arithmetic,
errors and entrypoints. No new unauthorized-withdrawal path was identified. This
is an internal review of the current source, not a proof of absence of defects.

| Area | Verification and remaining limits |
| --- | --- |
| Authorization | Initialize requires payer/authority/beneficiary; deposit uses has_one and signer; release checks beneficiary signer. Tests remove signer flags and substitute authorities. |
| PDA/account substitution | Both PDA seed domains, stored mint, vault owner/mint, classic token program and account owners are constrained. Added initialize substitutions assert expected ConstraintSeeds and complete account-creation rollback. |
| Arithmetic/time | Initialized schedules guarantee start < end and start <= cliff <= end. Differences widen before subtraction; u64 products fit u128. Added 2,048 deterministic wide schedules checking floor bounds, endpoints, cliff and monotonicity. Chain Clock is authoritative; backwards time fails without advancing releases. |
| Accounting/atomicity | Exact top-up only before first release; overfunding/incorrect amount rejected. u64 maximum conservation, failed CPIs and two releases in one transaction are covered. Transaction rollback protects accounting after CPI errors. |
| Impossible state | External callers cannot rewrite program-owned VestingAccount. Invalid schedules are rejected at initialization. An authorized malicious program upgrade is outside this immutable-source model and remains a custody/governance concern. |
| Fund blocking | Future cliffs, partial funding, mint freezing and irrecoverable donations remain explicit design limitations. No cancellation, arbitrary recovery or new authority power was introduced. |

The suite now has 47 Rust tests per identity: 36 integration, one load and ten math.
No program logic, ABI, seeds or layout changed in this continuation. JS dependency
regressions additionally cover actual Anchor TOML/Jayson UUID consumers and UTF-8.

## Offline rehearsal and publication preparation

The new rehearsal planner has no signing, send or RPC execution path. It requires
explicit Devnet scope, public addresses, separate authority/beneficiary, an isolated
mint and bounded exact decimal amounts/UTC schedules. Tests compare its three
instructions with Anchor's generated metas/data and independently inspect the
serialized u64/i64 values. Production identity and historical PAPA mint are rejected.
This proves instruction construction, not network state, deployment or custody.

Production URI validation now checks canonical encoded identifier structure instead
of a permissive prefix/length pattern. Metadata preparation preserves the reviewed
disclaimer and pinned logo and hashes deterministic JSON bytes. Download verification
rejects even whitespace changes to the approved JSON. Hosting permanence, URI
provenance and authority approval remain external. No on-chain program behavior,
account layout, dependency version or signer custody changed in this batch.
