import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const queryRequire = createRequire(require.resolve('query-string'));
it('Expo query parser resolves the patched callable decoder', () => {
  expect(queryRequire('decode-uri-component/package.json').version).toBe('0.5.1');
  expect(require('query-string').parse('name=hello%20world&money=%E2%82%AC')).toEqual({ name: 'hello world', money: '€' });
});
it('distinct encoded runs with a malformed suffix finish without quadratic rescanning', () => {
  const decoder = queryRequire.resolve('decode-uri-component');
  const code = `const decode=require(process.argv[1]); let payload='';
    for(let i=0;i<32000;i++) payload += '%' + Math.floor(i/256).toString(16).padStart(2,'0') + '%' + (i%256).toString(16).padStart(2,'0') + 'x';
    const output=decode(payload+'%zz');
    if(!output.endsWith('%zz') || decode('%2541%zz') !== '%41%zz') process.exit(1);`;
  const result = spawnSync(process.execPath, ['-e', code, decoder], { timeout: 5000 });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
});
it('malformed percent input finishes within a bounded process', () => {
  const decoder = queryRequire.resolve('decode-uri-component');
  const result = spawnSync(process.execPath, ['-e', 'const decode=require(process.argv[1]); decode("%FF".repeat(20000));', decoder], { timeout: 5000 });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
});
