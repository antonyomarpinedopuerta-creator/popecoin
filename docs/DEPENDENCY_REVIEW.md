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

CI now checks the Agave 3.1.10 Linux archive SHA-256 before extraction:
`a7205ff29bcf0f7199740225ecae2b85a28ea9668892d5ec21bd9749882984a1`.
Source: the digest field of the official
[Agave release API](https://api.github.com/repos/anza-xyz/agave/releases/tags/v3.1.10),
queried during this continuation. This pins bytes supplied by that release; it is
not a separate audit of the compiler or its supply chain.

## Exact installation warnings — 2026-09-27

A fresh `git archive HEAD` checkout, empty node_modules and empty Yarn cache
reproduced four installer warnings. These are separate from audit advisories.

| Warning | Action and reason |
| --- | --- |
| Missing `fastestsmallesttextencoderdecoder@^1.0.22` peer | Fixed by pinning 1.0.22. UTF-8 round-trip tests exercise the actual Solana codec resolution with non-ASCII metadata. |
| `toml@4.2.0` overrides Anchor's `^3.0.0` | Retained. Versions below 4.1.2 have prototype pollution ([maintainer advisory](https://github.com/BinaryMuse/toml-node/security/advisories/GHSA-v5mp-jgw5-2x6j)). Reverting merely to silence Yarn reintroduces affected code. Tests resolve TOML from Anchor, parse Anchor.toml and reject both published scalar-traversal payload variants. |
| `uuid@11.1.1` overrides Jayson's `^8.3.2` | Retained. 11.1.1 is the patched CommonJS-compatible line for [GHSA-w5hq-g745-h8pq](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq). Jayson uses v4, outside the vulnerable methods; tests nevertheless verify its actual request generator and patched v3 buffer bounds. Reverting revives the advisory; hiding or falsifying package versions is not a fix. |
| `Ignored scripts due to flag` | Retained deliberately. `--ignore-scripts` prevents dependency lifecycle execution, including unnecessary native installers. The clean installation and supported client/build tests work without those scripts. |

The new install has three expected warnings, no missing-peer warning. Yarn audit
still reports one high bigint-buffer finding and three moderate stream-json paths
(two distinct advisories), with 118 dependencies. Adding the peer introduces no
new advisory in this audit. The native bigint path remains removed by the vendor;
stream-json 3.5.0 is a different API/module layout than Jayson's 1.x imports, so a
blind override is unsafe. Rust audit remains zero vulnerabilities plus five
unmaintained notices and the previously documented rand unsoundness warning.

## Política automatizada de hallazgos retenidos

`npm run audit:dependencies` consulta Yarn y RustSec, conserva evidencia en
`target/dependency-audit.json` y falla ante auditoría indisponible, vulnerabilidad
Rust, advisory/ruta/severidad JavaScript nuevos o categoría/versión/aviso Rust nuevos.
`config/dependency-policy.json` enumera exclusivamente los hallazgos revisados;
no es una supresión del informe ni certifica ausencia de riesgo. CI instala
cargo-audit 0.22.2 y aplica esta política antes del RC. La ejecución del 27 de
septiembre de 2026 pasó con 4 rutas Yarn y 6 avisos Rust retenidos, cero
vulnerabilidades Rust, base RustSec e2111519ba6d14a5da59a7b2e5c8083ae8a37c01.
