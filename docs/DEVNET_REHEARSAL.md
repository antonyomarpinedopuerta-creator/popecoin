# Devnet rehearsal boundaries and evidence

`npm run rehearse:devnet` requires a clean HEAD, starts a temporary loopback HTTP
server and exercises actual public app assets and both vesting API roles against
Devnet. It validates expected identities, balances/coverage, unfrozen vaults,
ProgramData historical correspondence and metadata owner/PDA/mint/branding/URI.
It saves `target/devnet-rehearsal.json`, including timestamps and account slots,
and closes the server. It never loads a wallet or invokes signing/send methods.

`npm run check:metadata:remote` verifies the fixed public metadata and pinned
logo with response size limits, HTTPS and no redirects. This checks current
Devnet publication, not future storage availability or production permanence.

The local SBF suite tests initialize -> deposit -> release, cliff boundaries,
retries, atomic double release failure, malformed authorities/accounts and locked
fund scenarios. These are local VM results, not signed Devnet lifecycle evidence.

## Signed lifecycle still external

The current candidate is NOT the historical executable now deployed on Devnet.
To complete the real network rehearsal, an authorized operator must approve a
Devnet-only deployment target and use wallet-held signatures. The operator must
record the approved program ID, public fee payer, instruction/amount summaries,
simulation results, deployment transaction, ProgramData slot and binary match.
Then initialize an isolated short-lived test schedule, fully fund it, attempt a
pre-cliff claim, claim vested tokens, test duplicate/unauthorized claims, finish
the schedule, and reconcile all balances. Keep only public transaction signatures
and account snapshots in evidence; never include private keys or seed material.

Do not alter the historical reserve/founder positions for this rehearsal. Changing
identity produces different PDA seeds and a different binary and requires a new
explicitly reviewed Devnet build. No Mainnet actions, real funds or production
authority changes are part of this procedure. The current session does not execute
this signed section because it prohibits private-key access and custody changes.
