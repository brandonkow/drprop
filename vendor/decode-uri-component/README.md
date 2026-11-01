# SDK 57 decoder compatibility

Upstream `decode-uri-component` 0.5.1 fixes GHSA-vcc3-ghjq-m6fr and GHSA-qr28-fpjm-wq7f, but is ESM-only.
Expo Router 57 depends on CommonJS `query-string`, which requires a callable
CommonJS export. This copy changes only `export default function` to
`module.exports = function`; the upstream decoding algorithm is unchanged.
The MIT licence is included. The source tarball was checked against npm's SHA512
integrity before conversion. Remove this compatibility copy when the SDK's
query parser supports the patched upstream module directly.

Source: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.1
Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
Tarball integrity: `sha512-vWHQkXgg2cE3BB4rR0c+PYw9BCQzLoNIRMI7AunIkZst74tw/vpPp7VLoYtsR/cy1f55g3XDWUslfeCZjiZJyA==`

The root pins `query-string` 7.1.3 and the local decoder as development dependencies so npm resolves the same parser for Expo Router. The override references the direct decoder spec. `app/test/decoder.test.ts` verifies the parser actually resolves this callable module; a lockfile audit alone is insufficient.

The 0.5.1 update replaces the quadratic replacement loop with one pass over encoded runs. The regression test exercises distinct malformed runs through the installed CommonJS consumer.
