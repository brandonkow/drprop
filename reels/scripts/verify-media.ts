import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, type MediaExpectation } from './deliver';

const root = fileURLToPath(new URL('../../', import.meta.url));
interface Entry extends MediaExpectation { file: string; sha256: string; publication: boolean }
const entries = JSON.parse(readFileSync(new URL('../media-manifest.json', import.meta.url), 'utf8')) as Entry[];
const publication = process.argv.includes('--publication');
const walk = (dir: string): string[] => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((f) =>
  f.isDirectory() ? walk(`${dir}/${f.name}`) : f.name.endsWith('.mp4') ? [`${dir}/${f.name}`] : []);
let failed = 0;
const inventory = [...walk('reels/delivered'), ...walk('reels/samples'), ...readdirSync(resolve(root, 'brand/renders')).filter((n) => n.endsWith('.mp4')).map((n) => `brand/renders/${n}`)];
const names = entries.map((e) => e.file);
if (new Set(names).size !== entries.length || inventory.length !== names.length || inventory.some((n) => !names.includes(n))) {
  throw new Error('Media inventory does not match the manifest; review missing, extra or duplicate files');
}
for (const entry of entries) {
  const file = resolve(root, entry.file);
  if (relative(root, file).startsWith(`..${sep}`) || file === root) throw new Error('Manifest path leaves repository');
  if (entry.publication && /sample/i.test(entry.file)) throw new Error(`Sample cannot be published: ${entry.file}`);
  if (publication && !entry.publication) continue;
  const errors: string[] = [];
  try {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (hash !== entry.sha256) errors.push('SHA256 mismatch; review the media change before updating the manifest');
    errors.push(...check(file, entry));
  } catch (error) { errors.push(String(error)); }
  console.log(`${errors.length ? 'FAIL' : 'PASS'} ${entry.file}${errors.length ? ': ' + errors.join('; ') : ''}`);
  if (errors.length) failed++;
}
console.log(`${publication ? 'Publication' : 'Full'} media verification: ${failed} failures`);
process.exitCode = failed ? 1 : 0;
