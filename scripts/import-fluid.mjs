// Reproducible, pinned import of only the MIT simulation shaders.
import { mkdir, writeFile } from 'node:fs/promises';
const revision = 'a2d292931f19d9b3b9f564e23e6c32729d2121c3';
const base = `https://raw.githubusercontent.com/PavelDoGreat/WebGL-Fluid-Simulation/${revision}/`;
async function download(name) {
  const response = await fetch(base + name);
  if (!response.ok) throw new Error(`Upstream ${name}: ${response.status}`);
  return response.text();
}
const source = await download('script.js');
const names = ['splatShader', 'advectionShader', 'divergenceShader', 'curlShader', 'vorticityShader', 'pressureShader', 'gradientSubtractShader'];
const shaders = names.map(name => {
  const match = source.match(new RegExp(`const ${name} = compileShader\\(gl.FRAGMENT_SHADER, ` + '`([\\s\\S]*?)`'));
  if (!match) throw new Error(`Missing upstream shader: ${name}`);
  return `export const ${name} = ${JSON.stringify(match[1])};`;
});
await mkdir('src/effects/vendor', { recursive: true });
await writeFile('src/effects/vendor/pavel-shaders.ts', `/** MIT, Copyright (c) 2017 Pavel Dobryakov.\n * Extracted from revision ${revision}.\n * Full license: brand/licenses/fluid-MIT.txt. No promotional/UI code imported.\n */\n${shaders.join('\n\n')}\n`);
await writeFile('brand/licenses/fluid-MIT.txt', await download('LICENSE'));
console.log(`Imported ${names.length} fluid shaders from ${revision}`);
