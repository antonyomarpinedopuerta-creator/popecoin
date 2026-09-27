# Dependency review — 2026-09-26

This is internal triage, not an independent audit. Use Yarn 1.22.22 with the
committed lockfile and `--frozen-lockfile --ignore-scripts`. `npm run` is supported
for commands, but `npm install` does not enforce the Yarn resolutions.

## JavaScript

Registry audit initially reported one high finding and three paths to the same
moderate finding (two distinct advisories).

- [CVE-2025-3194 / bigint-buffer](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg):
  no patched upstream version. The resolution now points to
  `vendor/bigint-buffer`, the unchanged official 1.1.5 browser implementation,
  selected as the Node entry point. No native binding or installer is shipped.
  Its Apache license, origin and content hash are included. Tests verify the
  resolved SPL dependency uses these bytes, exact 64/128/256-bit conversions and
  large-buffer handling. This mitigates the native overflow path locally; it is
  not a claim that upstream 1.1.5 is fixed. Scanners may still report it.
- [CVE-2026-71429 / stream-json](https://github.com/uhop/stream-json/security/advisories/GHSA-528h-pc64-c93x):
  1.9.1 remains through web3.js → jayson. The affected path filters are not used
  by PAPA or the inspected jayson path, which imports StreamValues and Verifier.
  The advisory explicitly excludes the streamValues streamer. Version 3.5.0 is
  not forced over this dependency: jayson requires the CommonJS 1.x API and
  paths. Reevaluate when upgrading the client stack or adding streaming filters.
- Existing uuid 11.1.1 and toml 4.2.0 resolutions remain. Yarn warns that they
  override older requested ranges. IDL parsing, client instruction construction,
  HTTP reads and current tests are the compatibility evidence, not proof of all
  upstream features. A missing optional-use text encoder peer remains reported
  by the SPL codec dependency; no failure in the supported tested flows.

## Rust

`cargo-audit` database commit `e2111519ba6d14a5da59a7b2e5c8083ae8a37c01`
(last updated 2026-09-25) reported zero vulnerabilities, plus:

- Unmaintained: ansi_term 0.12.1, bincode 1.3.3, derivative 2.2.0,
  libsecp256k1 0.6.0, paste 1.0.15.
- RUSTSEC-2026-0097: rand 0.7.3, through LiteSVM → Agave syscalls → libsecp256k1
  (test dependencies). The resolved features do not enable rand's `log` feature;
  PAPA has no custom logger calling thread_rng. The documented triggering
  combination is absent. Follow upstream LiteSVM/Agave migration; do not change
  cryptographic dependency majors using blind lockfile overrides.

Audit commands (network reads only):

```sh
yarn audit --json
cargo audit --json
```

Nonzero Yarn audit status remains expected while advisories exist; never label
this dependency tree “zero vulnerabilities”. CI build checks do not substitute
for refreshed registry audits and human review before a release.

## Recovery refresh — 2026-09-26

Re-ran Yarn registry audit: one high finding for bigint-buffer and three moderate
paths for stream-json, matching the triage above. Verified the vendored JavaScript
SHA-256 against its README. Reinstalled cargo-audit 0.22.2 under `/tmp` after the
shutdown; a refreshed audit against the same RustSec database commit reports
zero vulnerabilities, the same five unmaintained warnings and RUSTSEC-2026-0097.
No dependency versions or lockfiles were changed during recovery.
