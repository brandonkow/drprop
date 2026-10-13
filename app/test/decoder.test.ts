import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const queryRequire = createRequire(require.resolve('query-string'));
it('Expo query parser resolves the patched callable decoder', () => {
  expect(queryRequire('decode-uri-component/package.json').version).toBe('0.5.0');
  expect(require('query-string').parse('name=hello%20world&money=%E2%82%AC')).toEqual({ name: 'hello world', money: '€' });
});
it('malformed percent input finishes within a bounded process', () => {
  const decoder = queryRequire.resolve('decode-uri-component');
  const result = spawnSync(process.execPath, ['-e', 'const decode=require(process.argv[1]); decode("%FF".repeat(20000));', decoder], { timeout: 5000 });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
});
