/**
 * What the dashboard draws into the model: the outline of the hovered or selected
 * zone, the route of the selected visit (walked: solid; still to come: dashed), and
 * the cups on the tables.
 */
import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  ShapeGeometry,
} from 'three';
import type { Vec2, Zone } from '../data.ts';
import type { Drop } from '../sim/planner.ts';

const Y = 0.03;

function frameGeometry(rect: Zone['rect'], w = 0.06): ShapeGeometry {
  const [x0, y0, x1, y1] = rect;
  const outer = new Shape();
  outer.moveTo(x0, y0);
  outer.lineTo(x1, y0);
  outer.lineTo(x1, y1);
  outer.lineTo(x0, y1);
  outer.closePath();
  const hole = new Path();
  hole.moveTo(x0 + w, y0 + w);
  hole.lineTo(x0 + w, y1 - w);
  hole.lineTo(x1 - w, y1 - w);
  hole.lineTo(x1 - w, y0 + w);
  hole.closePath();
  outer.holes.push(hole);
  return new ShapeGeometry(outer);
}

/** A flat strip along a polyline on the floor (plan coordinates). */
function ribbon(pts: Vec2[], w: number, dashed: boolean): BufferGeometry {
  const pos: number[] = [];
  const quad = (a: Vec2, b: Vec2) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * (w / 2);
    const ny = (dx / l) * (w / 2);
    const p = [
      [a[0] + nx, a[1] + ny],
      [a[0] - nx, a[1] - ny],
      [b[0] - nx, b[1] - ny],
      [b[0] + nx, b[1] + ny],
    ];
    for (const i of [0, 1, 2, 0, 2, 3]) pos.push(p[i]![0]!, Y, -p[i]![1]!);
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (!dashed) {
      quad(a, b);
      continue;
    }
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s < l; s += 0.42) {
      const e = Math.min(l, s + 0.24);
      const k0 = s / l;
      const k1 = e / l;
      quad([a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0], [a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

export class Overlay {
  readonly group = new Group();
  private readonly plate: Mesh;
  private readonly fill: Mesh;
  private readonly walked: Mesh;
  private readonly ahead: Mesh;
  private readonly cups: Mesh[] = [];
  private route: { t: number; xy: Vec2 }[] = [];
  private routeSplit = -1;

  constructor() {
    const plateMat = new MeshBasicMaterial({ color: '#1C1B19', transparent: true, opacity: 0.85, side: DoubleSide, depthWrite: false });
    this.plate = new Mesh(new BufferGeometry(), plateMat);
    this.plate.rotation.x = -Math.PI / 2;
    this.plate.position.y = Y;
    this.fill = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: '#8C6A43', transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false }));
    this.fill.rotation.x = -Math.PI / 2;
    this.fill.position.y = Y - 0.005;
    this.walked = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: '#8C6A43', transparent: true, opacity: 0.95, depthWrite: false }));
    this.ahead = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: '#8C6A43', transparent: true, opacity: 0.6, depthWrite: false }));
    for (const m of [this.plate, this.fill, this.walked, this.ahead]) {
      m.renderOrder = 2;
      m.raycast = () => {};
      this.group.add(m);
    }
    this.plate.visible = this.fill.visible = false;
  }

  zone(rect: Zone['rect'] | null, selected: boolean) {
    this.plate.visible = this.fill.visible = !!rect;
    if (!rect) return;
    this.plate.geometry.dispose();
    this.fill.geometry.dispose();
    // ShapeGeometry lies in x–y; rotated flat, plan y becomes −z as everywhere else.
    this.plate.geometry = frameGeometry(rect, selected ? 0.07 : 0.045);
    const s = new Shape();
    s.moveTo(rect[0], rect[1]);
    s.lineTo(rect[2], rect[1]);
    s.lineTo(rect[2], rect[3]);
    s.lineTo(rect[0], rect[3]);
    s.closePath();
    this.fill.geometry = new ShapeGeometry(s);
    (this.plate.material as MeshBasicMaterial).color.set(selected ? '#8C6A43' : '#1C1B19');
    this.fill.visible = selected;
  }

  /** The selected visit's route through the store, in its ring colour. */
  setRoute(points: { t: number; xy: Vec2 }[], color: string | null) {
    this.route = points;
    this.routeSplit = Number.NaN;
    (this.walked.material as MeshBasicMaterial).color.set(color ?? '#8C6A43');
    (this.ahead.material as MeshBasicMaterial).color.set(color ?? '#8C6A43');
    this.walked.visible = this.ahead.visible = points.length > 1;
  }

  setCups(drops: Drop[]) {
    for (const c of this.cups) this.group.remove(c);
    this.cups.length = 0;
    const geo = new CylinderGeometry(0.04, 0.032, 0.07, 14);
    const mat = new MeshStandardMaterial({ color: '#F6F3EC', roughness: 0.4 });
    for (const d of drops) {
      const m = new Mesh(geo, mat);
      m.position.set(d.at[0], d.at[2] + 0.035, -d.at[1]);
      m.castShadow = true;
      m.userData.drop = d;
      m.raycast = () => {};
      this.cups.push(m);
      this.group.add(m);
    }
  }

  update(t: number) {
    for (const c of this.cups) {
      const d = c.userData.drop as Drop;
      c.visible = t >= d.t0 && t < d.t1;
    }
    if (this.route.length < 2) return;
    // Re-split the route where the person is now (only when that changes).
    let i = 0;
    while (i < this.route.length && this.route[i]!.t <= t) i++;
    let here: Vec2 | null = null;
    if (i > 0 && i < this.route.length) {
      const a = this.route[i - 1]!;
      const b = this.route[i]!;
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
      here = [a.xy[0] + (b.xy[0] - a.xy[0]) * k, a.xy[1] + (b.xy[1] - a.xy[1]) * k];
    }
    const split = Math.round(t * 8); // a few rebuilds per simulated minute is smooth enough
    if (split === this.routeSplit) return;
    this.routeSplit = split;
    const done = this.route.slice(0, i).map((p) => p.xy);
    const todo = this.route.slice(i).map((p) => p.xy);
    if (here) {
      done.push(here);
      todo.unshift(here);
    }
    this.walked.geometry.dispose();
    this.ahead.geometry.dispose();
    this.walked.geometry = ribbon(done, 0.07, false);
    this.ahead.geometry = ribbon(todo, 0.06, true);
  }
}
