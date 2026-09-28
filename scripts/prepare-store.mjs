import { copyFile, mkdir, access } from 'node:fs/promises';
await mkdir('public/models', { recursive: true });
// A missing Blender export falls back to the original procedural concept.
const source = await access('brand/3d/store.glb').then(() => 'brand/3d/store.glb').catch(() => 'brand/3d/store-concept.glb');
await copyFile(source, 'public/models/store.glb');
