import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectPolicy } from '../src/effects/policy.ts';
test('motion and data-saving preferences bypass decorative code', () => {
  assert.equal(effectPolicy(true, 8).enabled, false);
  assert.equal(effectPolicy(false, 8, true).enabled, false);
});
test('memory threshold is strictly below 4 GB; unknown memory retains full policy', () => {
  assert.deepEqual(effectPolicy(false, 2), { enabled: true, fluid: false, pixelRatio: 1.5 });
  assert.equal(effectPolicy(false, 4).fluid, true);
  assert.equal(effectPolicy(false, undefined).fluid, true);
});
