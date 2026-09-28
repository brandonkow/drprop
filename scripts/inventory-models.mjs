import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files=(await readdir('brand/3d')).filter(file=>/\.(glb|blend)$/.test(file)).sort();
const outputs=[];
for(const file of files){const data=await readFile(`brand/3d/${file}`);outputs.push({file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),generator:file==='store.glb'||file==='store.blend'?'blender/build_store.py':file.startsWith('apothecary-blender')?'blender/build_apothecary.py':'scripts/export-models.mjs'});}
await writeFile('brand/3d/artifact-manifest.json',JSON.stringify({provenance:'Original procedural geometry; no real development or confirmed store plan.',outputs},null,2)+'\n');
console.log(`Inventoried ${outputs.length} original assets.`);
