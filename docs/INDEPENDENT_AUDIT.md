# Independent review scope and acceptance evidence

This is an audit preparation dossier, not an audit opinion or production approval.
The exact review target is the clean Git HEAD in `target/audit-review.json` and
its SHA-256-linked RC archive. Do not review a moving branch or infer deployment
from a successful local build. The local candidate has not been deployed.

## Reviewer entry points

- `programs/popecoin_vesting/src`: every instruction, state, error and constant.
- `programs/popecoin_vesting/tests`: SBF adversarial integration, load and math tests.
- `scripts`: build records, RC runner, packaging, readers and operator tools.
- `app`: readonly HTTP UI, route allowlist, error handling and concurrency limits.
- `vendor/bigint-buffer`, lockfiles, dependency policy and DEPENDENCY_REVIEW.md.
- `.github/workflows/ci.yml`, metadata, production plan and deployment procedure.

## Threats and independent questions

| Boundary | Existing evidence | Reviewer challenge |
|---|---|---|
| Initialization | Three signatures, PDA seeds, mint/source constraints | Missing signer, preoccupied PDA, substituted payer/source, reinitialization |
| Token movement | transfer_checked; token program, owner and mint constraints | Fake accounts/program, delegated source, wrong destination, rollback on CPI failure |
| Vesting | i128 time differences, u128 multiplication; 2048 generated schedules | i64 extremes, u64 maximum, floor rounding, cliff=end, time regression |
| Release | Beneficiary signature, tracked cumulative released, atomic state | Double release in one transaction, replay, insufficient funds, frozen vault |
| Funding | Exact top-up checked against balance | Partial financing, unsolicited donations, oversized deposit, arithmetic bounds |
| Readers/app | Owners, layout, PDA, common RPC context; allowlisted roles | RPC substitution, stale UI, invalid flags, malformed JSON, concurrency exhaustion |
| Build/release | Locked builds, fresh export, two CI replicas and archive validation | Missing inputs, source mutation, interrupted runner, corrupted or extra tar entries |
| Metadata | Exact disclaimer/branding, pinned PNG; remote size/redirect restrictions | Duplicate keys, changed image, wrong owner/PDA/mint/URI, mutable publication |

Known product constraints require explicit acceptance: no cancel/close/rescue;
excess tokens can remain locked; after a partial release deposit is disabled,
although direct SPL transfers can top up. Mint freeze authority could lock funds;
the contract does not enforce supply policy. Upgrade authority remains a trust
boundary. Internal tests cannot establish custody ownership or audit key backups.

## Reproduce and verify

Install the pinned tools described in README and use Yarn frozen-lockfile with
ignore-scripts. Run check:rc, verify:reproducible, check:clean, audit:dependencies,
check:metadata:remote and rehearse:devnet on a clean HEAD, then package:rc,
verify:package, `collect:ci -- <successful-run-id>` and prepare:audit. Remote commands are reads only and may fail on
network availability or changed chain state; a failure is never a release pass.

`audit-review.json` embeds the checked reports and their hashes, including readonly
observations and exact Git revision. The tar carries the public source inventory,
binaries, IDL and RC/reproduction evidence. A hash alone is not authentication;
obtain the intended commit and package digest through an independently trusted
channel. Review the CI run identity and permissions, not merely its green badge.

CI uses two separate ubuntu-24.04 runners and compares all six artifact hashes and
full source inventories. These runners share a platform/toolchain design; this
is not diverse-compilation proof. Run 36441044629 passed for f96ebfe; later commits require their own successful run. The two
artifact actions are pinned to upstream commits for
[upload v4.6.2](https://github.com/actions/upload-artifact/releases/tag/v4.6.2) and
[download v4.3.0](https://github.com/actions/download-artifact/releases/tag/v4.3.0).

## Finding and release decision record

For each finding record: exact commit, file/line, attacker capabilities, preconditions,
minimal reproduction, impact, severity, proposed fix, regression test and independent
retest outcome. Unresolved findings require a named human decision; no automated
allowlist substitutes for acceptance. Rebuild and re-review the final fixed commit.

External deliverables: signed/attributable audit report, verified candidate deployment
rehearsal, approved authorities and custody plan, definitive mint/date/durable URIs,
and explicit launch authorization. No release is authorized by this document.

## Hosted evidence acceptance

`collect:ci` checks the GitHub run repository, commit, workflow, event and all jobs;
it downloads the three named public artifacts, checks both tar inventories and
hashes without extraction and compares all six artifacts with the local candidate.
The dossier requires this evidence for its exact HEAD. Different Python versions
can change informational version strings in manifests; build artifacts and source
inventories must still match byte-for-byte. Both runners use the same toolchain;
this remains a reproducibility check, not an independent audit opinion.
