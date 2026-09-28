/**
 * Exports the procedural brand models to brand/3d/*.glb (brief §9.1: one set of
 * assets for web, app reference, reels and Blender).
 * Run: npm run brand:3d
 */
import { writeFileSync } from 'node:fs';
import { Scene, type Object3D } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildApothecary, buildClayHouse, buildMemberCard, buildPulseRoofSculpture } from '../3d/index.ts';

// GLTFExporter's binary path reads a Blob with FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buf) => {
      (this as { result: unknown }).result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
(globalThis as { FileReader?: unknown }).FileReader ??= NodeFileReader;

const MODELS: Record<string, () => Object3D> = {
  'pulse-roof': () => buildPulseRoofSculpture(),
  'clay-terrace': () => buildClayHouse({ type: 'terrace' }),
  'clay-condo': () => buildClayHouse({ type: 'condo' }),
  'clay-bungalow': () => buildClayHouse({ type: 'bungalow' }),
  apothecary: () => buildApothecary(),
  'member-card': () => buildMemberCard(),
};

const exporter = new GLTFExporter();
for (const [name, build] of Object.entries(MODELS)) {
  const scene = new Scene();
  scene.add(build());
  const glb = (await exporter.parseAsync(scene, { binary: true })) as ArrayBuffer;
  const out = new URL(`../3d/${name}.glb`, import.meta.url);
  writeFileSync(out, Buffer.from(glb));
  console.log(`wrote 3d/${name}.glb  ${(glb.byteLength / 1024).toFixed(1)} KB`);
}
