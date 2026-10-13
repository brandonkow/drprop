import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const exceptions = JSON.parse(readFileSync(new URL('../docs/security-exceptions.json', import.meta.url), 'utf8'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run audit:dependencies');
const result = spawnSync(process.execPath, [npm, 'audit', '--package-lock-only', '--json'], { encoding: 'utf8', maxBuffer: 16 << 20 });
if (result.error) throw result.error;
let report;
try { report = JSON.parse(result.stdout); } catch { throw new Error('Dependency audit did not return valid JSON'); }
if (report.error || !report.vulnerabilities || !report.metadata || ![0,1].includes(result.status)) throw new Error('Dependency audit unavailable; cannot pass the gate');
const seen = new Set();
let failures = 0;
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const advisory of vulnerability.via.filter((entry) => typeof entry === 'object')) {
    if (seen.has(advisory.url)) continue;
    seen.add(advisory.url);
    const exception = exceptions.find((item) => item.url === advisory.url && item.package === advisory.name && Date.parse(item.reviewBy) > Date.now());
    if (exception) console.warn(`OPEN, time-limited exception: ${advisory.name}: ${exception.reason} Review by ${exception.reviewBy}`);
    else { console.error(`FAIL ${advisory.name}: ${advisory.title} ${advisory.url}`); failures++; }
  }
}
console.log(`${seen.size} root advisories; ${failures} unhandled. Exceptions do not mean vulnerabilities are fixed.`);
process.exitCode = failures ? 1 : 0;
