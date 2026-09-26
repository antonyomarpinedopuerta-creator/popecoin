# Pure JavaScript bigint-buffer

This is the unmodified `dist/browser.js` and declarations from upstream
`bigint-buffer@1.1.5`, vendored under its Apache-2.0 license.

The package entry point selects the upstream JavaScript implementation in Node
as well. There is no native binding, `bindings` dependency, or install script.
This removes the native buffer-overflow execution path (CVE-2025-3194) while
preserving the conversion API required by SPL layouts.

Upstream: https://github.com/no2chem/bigint-buffer

JS SHA-256: `52233e36e5a854477a3f43f255e68474a9e4e46f51107d53320ad38ee5dff47c`

This is a local mitigation, not an upstream fix or independent audit. Version
1.1.5 is deliberately retained: dependency scanners may still flag the advisory.
Do not replace the resolution with the registry package without reevaluation.
The upstream width/overflow semantics are unchanged; callers must validate ranges.
