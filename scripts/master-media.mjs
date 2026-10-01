import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { audioVersion, masterVideo } from './audio-master.mjs';

const manifestPath = 'out/manifest-video.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.equal(manifest.outputs.length, 28, 'Finish the full video batch first.');
for (const item of manifest.outputs) {
  assert.equal(path.basename(item.file), item.file);
  const file = path.join('out', item.file), oldHash = item.sha256;
  assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), oldHash);
  if (item.audioMaster?.version === audioVersion && !process.argv.includes('--force')) {
    console.log(`Retained current audio master: ${item.file}`);
    continue;
  }
  item.audioMaster = await masterVideo(file, item.durationInFrames / item.fps, { silent: item.file.startsWith('StoreLoop-') });
  const data = await readFile(file);
  item.sha256 = createHash('sha256').update(data).digest('hex'); item.bytes = data.length;
  manifest.delivery = { ...manifest.delivery, audio: 'Original synthesized draft, -14 LUFS ±0.5, <= -1 dBTP; silent store loop' };
  manifest.audioMasteredAt = new Date().toISOString();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  // Keep filtered render manifests consistent when they reference this exact prior output.
  for (const name of (await readdir('out')).filter(name => name.startsWith('manifest-video-') && name.endsWith('.json'))) {
    const filteredPath = path.join('out', name), filtered = JSON.parse(await readFile(filteredPath, 'utf8'));
    const match = filtered.outputs.find(output => output.file === item.file && output.sha256 === oldHash);
    if (match) { Object.assign(match, item); await writeFile(filteredPath, JSON.stringify(filtered, null, 2) + '\n'); }
  }
  console.log(`Audio mastered: ${item.file}`);
}
