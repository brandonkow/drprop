import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = data => createHash('sha256').update(data).digest('hex');
const checks = [];
for (const [manifestPath, directory, count] of [
  ['brand/3d/artifact-manifest.json', 'brand/3d', 11],
  ['out/manifest-stills.json', 'out', 28],
  ['out/manifest-video.json', 'out', 28],
  ['out/manifest-stills-StoreReveal-16x9-frame300.json', 'out', 1],
  ['out/manifest-stills-StoreReveal-16x9-frame570.json', 'out', 1],
  ['out/manifest-video-FeeReveal-4x5.json', 'out', 1],
]) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.outputs.length, count);
  for (const output of manifest.outputs) {
    assert.equal(path.basename(output.file), output.file);
    const file = path.join(directory, output.file), data = await readFile(file);
    assert.equal(data.length, output.bytes, `${file}: byte count`);
    assert.equal(hash(data), output.sha256, `${file}: SHA-256`);
    checks.push({ file: file.replaceAll('\\', '/'), sha256: output.sha256, result: 'pass' });
  }
}
const backend = JSON.parse(await readFile('docs/qa/backend/verification.json', 'utf8'));
for (const source of backend.sources) {
  const data = (await readFile(source.file, 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(hash(data), source.sha256, `${source.file}: previous backend evidence no longer matches`);
}
const media = JSON.parse(await readFile('docs/qa/media-verification.json', 'utf8'));
const videos = JSON.parse(await readFile('out/manifest-video.json', 'utf8'));
assert.equal(media.complete, true); assert.equal(media.count, 28);
for (const video of videos.outputs) assert.equal(media.outputs.find(item => item.file === video.file)?.sha256, video.sha256, `${video.file}: rerun verify-media`);
await writeFile('docs/qa/delivery-artifact-audit.json', JSON.stringify({ checkedAt: new Date().toISOString(),
  result: 'pass', checks, backendSourceHashesMatched: backend.sources.length,
  mediaVerificationMatchesCurrentFiles: true,
  storeScope: 'Labelled concept retained at user request; actual plan not supplied.',
  deviceAcceptance: 'Pending at user request; see docs/device-acceptance.md.' }, null, 2) + '\n');
console.log(`Verified ${checks.length} delivery artifacts, ${backend.sources.length} unchanged backend sources and current media evidence.`);
