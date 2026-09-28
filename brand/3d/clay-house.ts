/**
 * 3D-2 — Clay houses: generic terrace, condo block and bungalow in white clay
 * (brief §9.3). Never a recognisable real building. Parts are named so R2/R3
 * can light up the "problem area" in bronze: roof | facade | structure | land.
 * `land` is the plot outline, standing in for the land title. Units: metres.
 */
import {
  BoxGeometry,
  ConeGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PlaneGeometry,
  Shape,
  type BufferGeometry,
  type Material,
} from 'three';
import { color } from '../tokens/tokens.ts';
import { materials } from './materials.ts';

export type HouseType = 'terrace' | 'condo' | 'bungalow';
export type HousePart = 'roof' | 'facade' | 'structure' | 'land';

function part(name: HousePart, geo: BufferGeometry, mat: Material) {
  const mesh = new Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Triangular gable roof along z. */
function gable(w: number, h: number, d: number) {
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function terrace(m: ReturnType<typeof materials>) {
  const g = new Group();
  const unitW = 6.1;
  const units = 3;
  const h = 7;
  const d = 12;
  const facade = new Group();
  facade.name = 'facade';
  const roof = new Group();
  roof.name = 'roof';
  for (let i = 0; i < units; i++) {
    const x = (i - (units - 1) / 2) * unitW;
    const body = part('facade', new BoxGeometry(unitW - 0.08, h, d), m.clay);
    body.position.set(x, h / 2, 0);
    facade.add(body);
    const r = part('roof', gable(unitW + 0.3, 2.6, d + 0.6), m.clay);
    r.position.set(x, h, 0);
    roof.add(r);
    // Porch slab and party walls read as terrace units, not a single block.
    const porch = part('structure', new BoxGeometry(unitW - 0.6, 0.18, 2.2), m.clay);
    porch.position.set(x, 3.2, d / 2 + 1.1);
    g.add(porch);
  }
  g.add(facade, roof);
  return { group: g, footprint: [units * unitW + 2, d + 6] as const };
}

function condo(m: ReturnType<typeof materials>) {
  const g = new Group();
  const w = 16;
  const d = 14;
  const floors = 14;
  const floorH = 3.1;
  const h = floors * floorH;
  const body = part('facade', new BoxGeometry(w, h, d), m.clay);
  body.position.y = h / 2;
  g.add(body);
  const structure = new Group();
  structure.name = 'structure';
  for (let f = 1; f < floors; f++) {
    const slab = part('structure', new BoxGeometry(w + 0.6, 0.22, d + 0.6), m.clay);
    slab.position.y = f * floorH;
    structure.add(slab);
  }
  g.add(structure);
  const roof = new Group();
  roof.name = 'roof';
  const top = part('roof', new BoxGeometry(w + 0.8, 0.5, d + 0.8), m.clay);
  top.position.y = h + 0.25;
  const plant = part('roof', new BoxGeometry(w * 0.35, 2.4, d * 0.4), m.clay);
  plant.position.y = h + 1.7;
  roof.add(top, plant);
  g.add(roof);
  return { group: g, footprint: [w + 10, d + 10] as const };
}

function bungalow(m: ReturnType<typeof materials>) {
  const g = new Group();
  const w = 18;
  const d = 12;
  const h = 3.6;
  const body = part('facade', new BoxGeometry(w, h, d), m.clay);
  body.position.y = h / 2;
  g.add(body);
  // Hipped roof: a four-sided pyramid stretched to the plan, with eaves.
  const cone = new ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  cone.rotateY(Math.PI / 4);
  const roof = part('roof', cone, m.clay);
  roof.scale.set(w + 1.6, 3.2, d + 1.6);
  roof.position.y = h + 1.6;
  g.add(roof);
  const porch = part('structure', new BoxGeometry(5, 0.2, 3), m.clay);
  porch.position.set(-w / 4, 0.1, d / 2 + 1.5);
  g.add(porch);
  return { group: g, footprint: [w + 10, d + 12] as const };
}

export interface ClayHouseOptions {
  type: HouseType;
  /** Part to outline in bronze. */
  highlight?: HousePart;
}

export function buildClayHouse({ type, highlight }: ClayHouseOptions): Group {
  const m = materials();
  const built = type === 'terrace' ? terrace(m) : type === 'condo' ? condo(m) : bungalow(m);
  const group = built.group;
  group.name = `clay-${type}`;

  const [fw, fd] = built.footprint;
  const land = part('land', new PlaneGeometry(fw, fd), m.clay);
  land.rotation.x = -Math.PI / 2;
  land.position.y = 0.01;
  group.add(land);

  if (highlight) {
    const edges = new LineBasicMaterial({ color: color.bronze, name: 'highlight-edges' });
    group.traverse((o) => {
      if (o instanceof Mesh && o.name === highlight) {
        o.material = m.highlight;
        const line = new LineSegments(new EdgesGeometry(o.geometry, 20), edges);
        line.name = `${highlight}-edges`;
        o.add(line);
      }
    });
  }
  return group;
}

/** Height of each type, m — for framing cameras. */
export const HOUSE_HEIGHT: Record<HouseType, number> = { terrace: 9.6, condo: 46, bungalow: 7 };
