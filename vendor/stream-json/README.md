# CommonJS stream-json 1.9.1 — local prototype safety backport

Origin/version/integrity and every original file SHA256: PROVENANCE.json. Original BSD-3-Clause license and UPSTREAM_README.md retained. All runtime entry points/dependencies stay CommonJS-compatible with locked jayson. No install scripts or test-only heya-unit dependency.

Assembler.js now creates an own enumerable/writable/configurable data property for `__proto__` in BOTH ordinary and reviver save paths, matching JSON.parse. This prevents parsed-object prototype replacement for object/array/null/scalar payloads. The semantics follow the maintainer's correction, with regression tests against actual `jayson.utils.parseStream` and direct Assembler. This is a local backport, not an upstream 1.9.1 security release. package.json deliberately retains version1.9.1; registry findings remain reported/reviewed.

Sources: [prototype advisory](https://github.com/uhop/stream-json/security/advisories/GHSA-mjw6-4jj6-33hc), [maintainer implementation](https://github.com/uhop/stream-json/blob/master/src/core/assembler.js), [1.9.1 source](https://github.com/uhop/stream-json/tree/1.9.1).

The [JSONC advisory](https://github.com/uhop/stream-json/security/advisories/GHSA-hqr4-qq8f-hg3x) concerns JSONC parser/verifier comment scanning. This vendored1.9.1 runtime contains no jsonc directory/entry points; the default parser rejects comments. Tests verify absence and rejection. The older path-filter DoS advisory remains documented: filters are shipped unchanged for API compatibility but unused by this application/Jayson's parsed path. Adding filter/JSONC features requires a new security review. This does not claim all stream-json uses are universally safe.
