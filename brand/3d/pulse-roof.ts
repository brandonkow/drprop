/**
 * 3D-1 — Pulse Roof sculpture: the brand line cut from brushed bronze, standing
 * on a travertine plinth (brief §9.3). Used by R1, the OG image, the app splash
 * still and the store screen loop. Units: metres.
 */
import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Vector2 } from 'three';
import { roofPoints } from '../pulse/pulse-roof.ts';
import { materials } from './materials.ts';
import { strokeShape } from './shapes.ts';

export interface PulseRoofSculptureOptions {
  /** Line length, m. */
  width?: number;
  /** Apex height above the baseline, m. */
  height?: number;
  /** Stroke width of the bronze line, m. */
  stroke?: number;
  /** Bronze thickness (depth), m. */
  depth?: number;
  plinth?: boolean;
}

export function buildPulseRoofSculpture(o: PulseRoofSculptureOptions = {}): Group {
  const width = o.width ?? 0.6;
  const height = o.height ?? 0.2;
  const stroke = o.stroke ?? 0.008;
  const depth = o.depth ?? 0.014;
  const m = materials();

  const pts = roofPoints({ apex: 0.5, halfSpan: 0.14, dip: 0.14 }).map(
    ([x, y]) => new Vector2((x - 0.5) * width, y * height),
  );
  const geo = new ExtrudeGeometry(strokeShape(pts, stroke), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0006,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);

  const group = new Group();
  group.name = 'pulse-roof-sculpture';
  const line = new Mesh(geo, m.bronze);
  line.name = 'line';
  // The dips go below the baseline: lift so they rest on the plinth.
  const dipDepth = 0.14 * height;
  line.position.y = dipDepth + stroke;
  group.add(line);

  if (o.plinth ?? true) {
    const plinthH = 0.06;
    const plinth = new Mesh(new BoxGeometry(width * 1.18, plinthH, 0.16), m.travertine);
    plinth.name = 'plinth';
    plinth.position.y = -plinthH / 2;
    group.add(plinth);
  }
  return group;
}
