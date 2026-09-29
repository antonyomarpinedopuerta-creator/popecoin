# PAPA deployment review procedure

This procedure prepares an operator review. It does not authorize a deployment,
signature, authority change, real-fund transaction or Mainnet operation. Historical
command examples have been removed because they mixed release and Devnet binaries
and used an implicit local wallet. Their history remains in Git.

## 1. Freeze the exact candidate

Record clean Git HEAD, successful hosted run, public package digest and audit
findings. Use the RC/reproduction/clean-build reports for that HEAD. Compare the
hosted artifacts using `npm run collect:ci -- <run-id>` and prepare the dossier
with `npm run prepare:audit`. If public inputs change, the previous evidence does
not certify the new revision. Never package all of target/deploy.

## 2. Select the network and deployment identity explicitly

Only Devnet is in the current rehearsal scope. An authorized operator must verify
the RPC endpoint AND genesis hash against independently trusted Devnet information;
a local CLI default or a URL label alone is insufficient.

| Candidate | Embedded program ID | Binary path |
|---|---|---|
| Release, offline only | AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn | target/deploy/popecoin_vesting.so |
| Historical Devnet identity | BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc | target/devnet-workspace/target/deploy/popecoin_vesting.so |

The root IDL is for release; Devnet clients explicitly adapt the address. Changing
Anchor.toml's provider does not change the identity embedded in an ELF. A new
isolated program ID needs a separately reviewed build and new hashes. Never reuse
a binary merely because its filename is the same. Generated deployment key files
are not identity evidence and are excluded from this procedure.

`build:devnet` targets the historical identity in the table; it is not a builder
for an arbitrary isolated rehearsal ID. `prepare:rehearsal` rejects both IDs in
the table as deployment targets. Follow the staged public setup and authorization
review in [DEVNET_REHEARSAL.md](DEVNET_REHEARSAL.md#next-operator-review-no-execution-authorization-yet).

The local candidate has NOT been deployed. The existing Devnet ProgramData matches
a historical executable, not this candidate. Do not overwrite the existing reserve
or founder experiment to claim an isolated rehearsal was completed.

## 3. Review public authorities and token state

Before any authorized operation, record program/ProgramData addresses, current
upgrade authority, proposed public signers, fee payer and instruction account metas.
Verify control through the approved wallet-held signing process; do not export keys.
Private backup/custody claims in historical documents have not been revalidated.

For rehearsal use an isolated classic SPL test mint with 6 decimals and no freeze
authority. Record supply, mint authority, token-program owner, source/destination
owners, balances, delegates and close authorities. Require new vesting/vault PDAs.
Production supply and authority policies are separate human decisions: the vesting
program itself neither caps mint supply nor prevents a mint freeze authority.

## 4. Prepare and review the rehearsal

Fill only approved public values in config/rehearsal-plan.json. Run
`npm run prepare:rehearsal`. It emits three unsigned instruction descriptions with
ordered account metas, encoded data, schedule, PDAs and a digest. It does not select
a blockhash, simulate, access a wallet or send a transaction. Unknown public values
remain null; synthetic test fixtures are never approved deployment parameters.

An operator must independently verify candidate correspondence, Devnet chain time,
fees/rent, fresh account state and funding before each step. Initialize creates the
vault; the prepared deposit assumes it remains empty and must be regenerated if
any tokens arrive first. Repeated release uses current chain time and released state,
not a fixed amount from the plan. Review pre-cliff failures and repeated-claim
outcomes: a repeated claim fails only when no additional units are releasable.

## 5. Simulate, approve and sign externally

Use a reviewed wallet/hardware/multisig integration holding the keys. Review the
exact network, program, mint, recipients, amounts, writable accounts and fee payer.
Obtain explicit approval before any wallet simulation. Simulate against current state,
present the result, then obtain separate explicit approval immediately before
signing. Refresh expired blockhashes through the reviewed flow and re-simulate when
state changes. No script or document in this repository is blanket approval.

Legacy devnet-*.ts and metadata mutation scripts load external JSON signers and
may send transactions directly. They are historical operator tools, NOT the new
rehearsal path, and are not executed by this session. Do not run them to bypass the
review above. A wallet-held signing integration remains an external prerequisite.

## 6. Reconcile after an authorized rehearsal

Record public transaction signatures, confirmation slots, instruction results,
ProgramData and executable digest, and token/vesting snapshots at each checkpoint.
Exercise initialize, full deposit, pre-cliff rejection, partial claim, repeated
claims reconciled by chain time, unauthorized claim rejection, final claim and
final balance conservation. Account
for fees separately from token balances. Confirm no historical PAPA position changed.
A local LiteSVM test or a readonly snapshot is not evidence of this signed lifecycle.

## 7. Stop conditions

Stop on unexpected cluster/identity/authority, binary mismatch, frozen mint/account,
occupied PDA, altered metadata, insufficient funding, failed simulation, stale
blockhash or unreviewed account meta. Do not repair by revoking authorities, changing
custody or deploying another binary without a new review. No --final, authority
revocation or other irreversible action is part of this routine procedure.

## Production remains external

Require independent security review, approved custody and public authorities,
definitive mint/date, verified durable metadata publication, allocation reconciliation,
and explicit launch authorization. Internal tests and two matching CI builds do not
replace an independent audit or demonstrate control of production signers.
