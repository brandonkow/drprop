/**
 * Low-poly set dressing in the spirit of a strategy-game map: trees along the road
 * and slow traffic (shophouse), planters and benches on the concourse (mall), and
 * the store's own plants, which the export leaves out (the scanned ones are too
 * heavy for the web).
 */
import {
  BoxGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { PlanData } from '../data.ts';

const mat = (color: string, roughness = 0.85, flat = true) => new MeshStandardMaterial({ color, roughness, flatShading: flat });

const M = {
  leaf: [mat('#9AA38F'), mat('#8D9886'), mat('#A7AE98')],
  trunk: mat('#6B5744'),
  pot: mat('#B98A66', 0.8, false),
  potStone: mat('#CFC6B6', 0.9, false),
  car: [mat('#EDE9E1', 0.45, false), mat('#B7B1A6', 0.45, false), mat('#D9CFBF', 0.45, false), mat('#9AA39B', 0.45, false)],
  glass: mat('#2B2E30', 0.15, false),
  tyre: mat('#1C1B19', 0.9, false),
};

function shadows<T extends Group | Mesh>(o: T): T {
  o.traverse((c) => {
    if ((c as Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      c.raycast = () => {};
    }
  });
  return o;
}

export function tree(x: number, y: number, h: number, seed: number): Group {
  const g = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.09, 0.13, h * 0.45, 7), M.trunk);
  trunk.position.y = h * 0.225;
  g.add(trunk);
  const n = 3 + (seed % 2);
  for (let i = 0; i < n; i++) {
    const r = h * (0.24 + 0.06 * ((seed + i) % 3));
    const c = new Mesh(new IcosahedronGeometry(r, 0), M.leaf[(seed + i) % 3]!);
    const a = (i / n) * Math.PI * 2 + seed;
    c.position.set(Math.cos(a) * r * 0.55, h * (0.62 + 0.12 * (i % 2)), Math.sin(a) * r * 0.55);
    c.rotation.set(seed + i, i, seed);
    g.add(c);
  }
  g.position.set(x, 0, -y);
  return shadows(g);
}

/** A potted plant (indoor), in the spirit of the scanned ones it replaces. */
export function plant(x: number, y: number, h: number, seed: number): Group {
  const g = new Group();
  const potH = Math.min(0.42, h * 0.3);
  const pot = new Mesh(new CylinderGeometry(0.2 * Math.min(1, h), 0.15 * Math.min(1, h), potH, 18), h > 1 ? M.pot : M.potStone);
  pot.position.y = potH / 2;
  g.add(pot);
  const leaves = Math.max(3, Math.round(h * 4));
  for (let i = 0; i < leaves; i++) {
    const r = 0.12 + 0.05 * ((seed + i) % 3);
    const l = new Mesh(new DodecahedronGeometry(r, 0), M.leaf[(seed + i) % 3]!);
    const a = i * 2.4 + seed;
    const k = i / leaves;
    l.position.set(Math.cos(a) * 0.18 * (1 - k * 0.5), potH + (h - potH) * (0.25 + 0.7 * k), Math.sin(a) * 0.18 * (1 - k * 0.5));
    l.scale.set(1, 0.7, 1.3);
    l.rotation.set(a, k * 2, seed);
    g.add(l);
  }
  g.position.set(x, 0, -y);
  return shadows(g);
}

export function car(seed: number): Group {
  const g = new Group();
  const body = M.car[seed % M.car.length]!;
  const base = new Mesh(new BoxGeometry(4.2, 0.62, 1.78), body);
  base.position.y = 0.55;
  const cab = new Mesh(new BoxGeometry(2.3, 0.55, 1.6), body);
  cab.position.set(-0.2, 1.12, 0);
  const glass = new Mesh(new BoxGeometry(2.32, 0.4, 1.62), M.glass);
  glass.position.set(-0.2, 1.1, 0);
  glass.scale.set(1, 1, 1);
  g.add(base, cab, glass);
  for (const [dx, dz] of [[1.35, 0.8], [-1.35, 0.8], [1.35, -0.8], [-1.35, -0.8]] as const) {
    const w = new Mesh(new CylinderGeometry(0.32, 0.32, 0.24, 14), M.tyre);
    w.rotation.x = Math.PI / 2;
    w.position.set(dx, 0.32, dz);
    g.add(w);
  }
  return shadows(g);
}

export interface Traffic {
  group: Group;
  update(t: number): void;
}

/** Cars along the road, in both directions, looping slowly with the clock. */
export function traffic(island: [number, number, number, number]): Traffic {
  const group = new Group();
  const [x0, , x1] = island;
  const lanes = [
    { y: -5.0, dir: 1, speed: 9 },
    { y: -11.3, dir: -1, speed: 11 },
  ];
  const cars = [0, 1, 2, 3].map((i) => {
    const c = car(i);
    group.add(c);
    const lane = lanes[i % 2]!;
    c.scale.setScalar(0.92);
    return { c, lane, offset: i * 31.3 };
  });
  const span = x1 - x0 + 12;
  return {
    group,
    update(t: number) {
      for (const { c, lane, offset } of cars) {
        const s = (((t * lane.speed + offset) % span) + span) % span;
        const x = lane.dir > 0 ? x0 - 6 + s : x1 + 6 - s;
        c.position.set(x, -0.18, -lane.y);
        c.rotation.y = lane.dir > 0 ? 0 : Math.PI;
        c.visible = x > x0 + 1.5 && x < x1 - 1.5;
      }
    },
  };
}

export function dress(plan: PlanData, island: [number, number, number, number]): { group: Group; traffic: Traffic | null } {
  const group = new Group();
  for (const [i, [x, y, h]] of plan.plants.entries()) group.add(plant(x, y, Math.max(0.35, h), i + 3));
  let moving: Traffic | null = null;
  if (plan.setting === 'shophouse') {
    // A planted median down the road; trees stand at the edges of the model, never
    // between the camera and the store.
    const [ix0, iy0, ix1, iy1] = island;
    const median = new Mesh(new BoxGeometry(ix1 - ix0, 0.16, 1.4), M.potStone);
    median.position.set((ix0 + ix1) / 2, -0.18 + 0.08, 8.1);
    group.add(shadows(median));
    const spots: [number, number, number][] = [
      [ix0 + 1.6, -3.6, 3.2],
      [ix0 + 1.2, 2.5, 3.6],
      [ix0 + 1.8, 7.8, 3.0],
      [2.0, iy1 - 1.1, 3.4],
      [7.5, iy1 - 1.2, 3.0],
      [ix1 - 1.4, iy1 - 1.3, 3.5],
      [ix1 - 1.3, -3.4, 3.1],
      [ix0 + 1.4, iy0 + 1.3, 2.8],
      [ix1 - 1.6, iy0 + 1.2, 2.9],
    ];
    spots.forEach(([x, y, h], i) => group.add(tree(x, y, h, i)));
    moving = traffic(island);
    group.add(moving.group);
  } else {
    // Planters on the concourse, to either side of the shopfront.
    const W = plan.width;
    for (const [i, [x, y]] of ([[-4.8, -3.2], [W + 3.8, -3.2], [W + 3.8, -7.2]] as const).entries()) {
      const box = new Mesh(new BoxGeometry(1.6, 0.5, 1.6), M.potStone);
      box.position.set(x, 0.25, -y);
      group.add(shadows(box));
      const t = tree(x, y, 2.6, i + 11);
      t.position.y = 0.5;
      group.add(t);
    }
  }
  return { group, traffic: moving };
}
