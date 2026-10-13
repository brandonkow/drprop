# SDK 57 decoder compatibility

Upstream `decode-uri-component` 0.5.0 fixes GHSA-vcc3-ghjq-m6fr, but is ESM-only.
Expo Router 57 depends on CommonJS `query-string`, which requires a callable
CommonJS export. This copy changes only `export default function` to
`module.exports = function`; the upstream decoding algorithm is unchanged.
The MIT licence is included. The source tarball was checked against npm's SHA512
integrity before conversion. Remove this compatibility copy when the SDK's
query parser supports the patched upstream module directly.

Source: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0
Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
Tarball integrity: `sha512-1BiQVoK8C9gUbQU6NzAtO/tkz2qOFpEObMWpcFvhx4fYnj4Oc5yzaJN/LD36ihkVUdXyh5ZekzX+yM+ty/SrPg==`

The root pins `query-string` 7.1.3 and the local decoder as development dependencies so npm resolves the same parser for Expo Router. The override references the direct decoder spec. `app/test/decoder.test.ts` verifies the parser actually resolves this callable module; a lockfile audit alone is insufficient.
