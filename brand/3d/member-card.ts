/**
 * 3D-5 — member card: dark brushed metal, ID-1 proportions, with the Pulse Roof
 * line, DR. PROP and the member number raised in lighter metal (brief §9.3).
 * Scaled ×10 for convenient scene units: 0.856 × 0.54 × 0.008.
 */
import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Vector2, type Shape } from 'three';
import { LOGO } from '../logo/logo-paths.ts';
import { GEIST_MONO } from './glyphs.generated.ts';
import { materials } from './materials.ts';
import { pathToShapes, strokeShape } from './shapes.ts';

const W = 0.856;
const H = 0.54;
const T = 0.008;
const RAISE = 0.0006;

function textShapes(text: string, size: number, x: number, y: number, tracking = 0.08): Shape[] {
  const out: Shape[] = [];
  let pen = x;
  for (const ch of text) {
    const d = GEIST_MONO.glyphs[ch];
    if (d) out.push(...pathToShapes(d, { scale: size / GEIST_MONO.unitsPerEm, x: pen, y }));
    pen += (GEIST_MONO.advance + tracking) * size;
  }
  return out;
}

export interface MemberCardOptions {
  memberNo?: string;
}

export function buildMemberCard({ memberNo = 'PJ-0259' }: MemberCardOptions = {}): Group {
  const m = materials();
  const g = new Group();
  g.name = 'member-card';

  const body = new Mesh(new BoxGeometry(W, H, T), m.cardMetal);
  body.name = 'body';
  g.add(body);

  const raised = (shapes: Shape[], name: string) => {
    const geo = new ExtrudeGeometry(shapes, { depth: RAISE, bevelEnabled: false, curveSegments: 4 });
    const mesh = new Mesh(geo, m.engraving);
    mesh.name = name;
    mesh.position.z = T / 2;
    g.add(mesh);
  };

  // Logo, top-left: the same outlines as logo.svg.
  const logoScale = (W * 0.42) / LOGO.width;
  const lx = -W / 2 + 0.05;
  const ly = H / 2 - 0.05;
  raised(pathToShapes(LOGO.wordmark, { scale: logoScale, x: lx, y: ly }), 'wordmark');
  const logoLine = LOGO.line
    .match(/-?\d*\.?\d+/g)!
    .map(Number)
    .reduce<Vector2[]>((acc, v, i, arr) => (i % 2 ? acc : [...acc, new Vector2(lx + v * logoScale, ly - arr[i + 1]! * logoScale)]), []);
  raised([strokeShape(logoLine, 1.5 * logoScale)], 'logo-line');

  // Member number, bottom-left, Geist Mono.
  raised(textShapes(memberNo, 0.05, -W / 2 + 0.05, -H / 2 + 0.07), 'member-no');
  return g;
}

export const MEMBER_CARD_SIZE = { width: W, height: H, thickness: T } as const;
