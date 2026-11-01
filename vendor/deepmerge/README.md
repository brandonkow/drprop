# Local deepmerge hardening

Based on the MIT-licensed `deepmerge@4.3.1` CommonJS distribution. License and
types are retained. This is a local patch, not an upstream fixed release.

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
has no upstream patched version as checked on 2026-10-29. The target-copy branch
can assign a JSON object's own `__proto__` property to a normal destination and
change its prototype. Both target-copy and source-merge branches now discard
`__proto__`, `constructor` and `prototype` keys at every recursive object merge.
Normal arrays, symbols and custom merging remain supported.

`scripts/deepmerge.test.ts` reproduces both target and source poisoning, nested
objects, constructor/prototype keys and ordinary configuration merging. The root
override resolves this local dependency from Expo after the 2026-11-01 lockfile
refresh. `scripts/dependency-resolution.test.ts` verifies the actual installed
Expo resolution and repeats the poisoning regression through that consumer.
Revisit when an upstream patch becomes available; do not edit installed
node_modules in place.
