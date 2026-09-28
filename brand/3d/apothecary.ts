/**
 * 3D-4 — the apothecary snack wall (brief §4.3, §9.3): walnut cabinet, brass
 * pulls, paper prescription labels. Drawers are named `drawer-<row>-<col>` and
 * their front faces +z, so a reel can slide one out by moving it along z.
 * Units: metres.
 */
import { BoxGeometry, CylinderGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { materials } from './materials.ts';

export interface ApothecaryOptions {
  rows?: number;
  cols?: number;
}

export const APOTHECARY_LABELS = [
  'Kopi Tarik', 'Kopi-O Kosong', 'Teh Tarik', 'Kuih Seri Muka',
  'Kuih Lapis', 'Ondeh-Ondeh', 'Kaya Toast', 'Pandan Chiffon',
  'Tau Sar Pneah', 'Barley Ais', 'Milo Ais', 'Pineapple Tart',
];

export function buildApothecary(o: ApothecaryOptions = {}): Group {
  const rows = o.rows ?? 5;
  const cols = o.cols ?? 4;
  const m = materials();
  const dw = 0.32; // drawer width
  const dh = 0.2;
  const depth = 0.42;
  const gap = 0.012;
  const frame = 0.03;
  const W = cols * dw + (cols + 1) * gap + frame * 2;
  const plinth = 0.12;
  const H = rows * dh + (rows + 1) * gap + frame * 2;

  const g = new Group();
  g.name = 'apothecary';

  const carcass = new Mesh(new BoxGeometry(W, H, depth), m.walnut);
  carcass.name = 'carcass';
  carcass.position.set(0, plinth + H / 2, -depth / 2);
  g.add(carcass);
  const base = new Mesh(new BoxGeometry(W - 0.06, plinth, depth - 0.06), m.walnut);
  base.name = 'plinth';
  base.position.set(0, plinth / 2, -depth / 2);
  g.add(base);
  const cornice = new Mesh(new BoxGeometry(W + 0.04, 0.04, depth + 0.03), m.walnut);
  cornice.name = 'cornice';
  cornice.position.set(0, plinth + H + 0.02, -depth / 2);
  g.add(cornice);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const drawer = new Group();
      drawer.name = `drawer-${r}-${c}`;
      const x = -W / 2 + frame + gap + dw / 2 + c * (dw + gap);
      const y = plinth + H - frame - gap - dh / 2 - r * (dh + gap);
      drawer.position.set(x, y, 0);

      const front = new Mesh(new BoxGeometry(dw, dh, 0.02), m.walnut);
      front.name = 'front';
      front.position.z = 0.01;
      const box = new Mesh(new BoxGeometry(dw - 0.02, dh - 0.02, depth - 0.04), m.walnut);
      box.name = 'box';
      box.position.z = -(depth - 0.04) / 2;
      const label = new Mesh(new PlaneGeometry(dw * 0.55, dh * 0.28), m.paper);
      label.name = 'label';
      label.userData.text = `Rx · ${APOTHECARY_LABELS[(r * cols + c) % APOTHECARY_LABELS.length]}`;
      label.position.set(0, dh * 0.18, 0.0205);
      const pull = new Mesh(new CylinderGeometry(0.011, 0.011, 0.025, 16), m.brass);
      pull.name = 'pull';
      pull.rotation.x = Math.PI / 2;
      pull.position.set(0, -dh * 0.2, 0.032);
      drawer.add(front, box, label, pull);
      g.add(drawer);
    }
  }
  return g;
}
