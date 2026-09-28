import { mkdir, cp, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = path.join(root, 'reels/public');
await mkdir(path.join(publicDir, 'fonts'), { recursive: true });
await cp(path.join(root, 'brand/3d'), path.join(publicDir, 'models'), { recursive: true });
for (const [name, file] of Object.entries({
  'InstrumentSerif.woff2': '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  'Geist.woff2': '@fontsource/geist/files/geist-latin-400-normal.woff2',
  'GeistMono.woff2': '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2',
})) await copyFile(path.join(root, 'node_modules', file), path.join(publicDir, 'fonts', name));
console.log('Prepared local fonts and shared models.');
