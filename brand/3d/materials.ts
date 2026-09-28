/**
 * Physical materials for the brand 3D set (brief §6.3, §9.3): travertine,
 * walnut, linen-white clay, brushed bronze, brass, dark brushed metal, paper.
 * Plain PBR parameters, no textures, so the models export cleanly to glTF and
 * look the same in three.js, Remotion and Blender.
 */
import { MeshStandardMaterial } from 'three';
import { color } from '../tokens/tokens.ts';

export const materials = () => ({
  bronze: new MeshStandardMaterial({ name: 'bronze', color: color.bronze, metalness: 1, roughness: 0.38 }),
  travertine: new MeshStandardMaterial({ name: 'travertine', color: color.travertine, metalness: 0, roughness: 0.92 }),
  clay: new MeshStandardMaterial({ name: 'clay', color: '#ECE7DE', metalness: 0, roughness: 0.95 }),
  walnut: new MeshStandardMaterial({ name: 'walnut', color: '#46321F', metalness: 0, roughness: 0.62 }),
  brass: new MeshStandardMaterial({ name: 'brass', color: '#B08D57', metalness: 1, roughness: 0.3 }),
  paper: new MeshStandardMaterial({ name: 'paper', color: color.bone, metalness: 0, roughness: 0.9 }),
  cardMetal: new MeshStandardMaterial({ name: 'card-metal', color: '#1F1E1B', metalness: 1, roughness: 0.34 }),
  engraving: new MeshStandardMaterial({ name: 'engraving', color: '#9C9588', metalness: 1, roughness: 0.22 }),
  /** Highlight for "problem areas" on clay houses (R2): bronze, pulsed by the caller. */
  highlight: new MeshStandardMaterial({
    name: 'highlight',
    color: color.bronze,
    emissive: color.bronze,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.6,
  }),
});

export type Materials = ReturnType<typeof materials>;
