/**
 * 2D → 3D helpers shared by the procedural models:
 *   - pathToShapes: SVG path data (M L Q C Z, absolute) → THREE.Shapes, for
 *     the DR. PROP wordmark and engraved member numbers
 *   - strokeShape:  a polyline stroked with mitred joins → one closed Shape,
 *     so the Pulse Roof line can be extruded into a solid ribbon
 */
import { Shape, ShapePath, Vector2 } from 'three';

export interface PathTransform {
  scale: number;
  /** Flip y (SVG is y-down, three.js is y-up). Default true. */
  flipY?: boolean;
  x?: number;
  y?: number;
}

export function pathToShapes(d: string, t: PathTransform): Shape[] {
  const sp = new ShapePath();
  const flip = t.flipY ?? true;
  const X = (v: number) => (t.x ?? 0) + v * t.scale;
  const Y = (v: number) => (t.y ?? 0) + (flip ? -v : v) * t.scale;
  const tokens = d.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M':
        sp.moveTo(X(num()), Y(num()));
        break;
      case 'L':
        sp.lineTo(X(num()), Y(num()));
        break;
      case 'Q': {
        const [x1, y1, x, y] = [num(), num(), num(), num()];
        sp.quadraticCurveTo(X(x1), Y(y1), X(x), Y(y));
        break;
      }
      case 'C': {
        const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()];
        sp.bezierCurveTo(X(x1), Y(y1), X(x2), Y(y2), X(x), Y(y));
        break;
      }
      case 'Z':
      case 'z':
        sp.currentPath?.closePath();
        break;
      default:
        throw new Error(`pathToShapes: unsupported command ${cmd}`);
    }
  }
  // three.js sorts outlines into solids and holes by containment.
  return sp.toShapes();
}

/**
 * Outline of a polyline stroked `width` wide with mitred joins (miter limit 4),
 * as a single closed Shape: left side forward, right side back.
 */
export function strokeShape(points: readonly Vector2[], width: number): Shape {
  const h = width / 2;
  const left: Vector2[] = [];
  const right: Vector2[] = [];
  const normal = (a: Vector2, b: Vector2) => {
    const d = b.clone().sub(a).normalize();
    return new Vector2(-d.y, d.x);
  };
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const prev = points[i - 1];
    const next = points[i + 1];
    let n: Vector2;
    let len = h;
    if (!prev) n = normal(p, next!);
    else if (!next) n = normal(prev, p);
    else {
      const n0 = normal(prev, p);
      const n1 = normal(p, next);
      n = n0.clone().add(n1).normalize();
      const cos = n.dot(n1);
      len = Math.min(h / Math.max(cos, 1e-3), h * 4);
    }
    left.push(p.clone().addScaledVector(n, len));
    right.push(p.clone().addScaledVector(n, -len));
  }
  return new Shape([...left, ...right.reverse()]);
}
