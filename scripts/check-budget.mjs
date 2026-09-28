import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const files = (await readdir('dist/assets')).filter(file => file.endsWith('.js'));
const chunks = await Promise.all(files.map(async file => {
  const data = await readFile(`dist/assets/${file}`);
  return { file, bytes: data.length, gzipBytes: gzipSync(data).length };
}));
const gzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
const report = { limitBytes: 250000, gzipBytes, passed: gzipBytes < 250000, chunks };
await mkdir('docs/qa', { recursive: true });
await writeFile('docs/qa/bundle-size.json', JSON.stringify(report, null, 2) + '\n');
console.log(`All JavaScript chunks, including lazy effects: ${gzipBytes} / 250000 gzip bytes`);
if (!report.passed) process.exitCode = 1;
