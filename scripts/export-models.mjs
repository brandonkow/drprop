import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { modelFactories } from '../brand/three/models.mjs';
// GLTFExporter's browser FileReader needs only these Blob conversions for untextured geometry.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
await mkdir('brand/3d', { recursive: true });
const manifest = { generator: 'scripts/export-models.mjs', provenance: 'Original procedural geometry. No third-party models or real developments.', storeStatus: 'Unconfirmed 8 x 12 m concept; replace with an approved measured plan.', models: [] };
for (const [name, create] of Object.entries(modelFactories)) {
  const model = create(); model.updateMatrixWorld(true);
  const data = Buffer.from(await new GLTFExporter().parseAsync(model, { binary: true }));
  await writeFile(`brand/3d/${name}.glb`, data);
  manifest.models.push({ file: `${name}.glb`, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
  model.traverse(item => { item.geometry?.dispose(); if (Array.isArray(item.material)) item.material.forEach(value => value.dispose()); else item.material?.dispose(); });
}
await writeFile('brand/3d/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
