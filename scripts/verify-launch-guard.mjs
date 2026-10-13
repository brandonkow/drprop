import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build:production', '-w', '@drprop/web'], { encoding: 'utf8', maxBuffer: 8 << 20 });
const output = `${result.stdout}\n${result.stderr}`;
// Current checked-in configuration is deliberately incomplete. A real launch
// replaces this fixture assertion with the successful production build gate.
if (result.error || result.status === 0 || !output.includes('Production requires complete launch configuration')) {
  console.error(output); throw new Error('Expected the production build to reject placeholder settings');
}
console.log('PASS: production refused incomplete configuration, including a missing origin.');
