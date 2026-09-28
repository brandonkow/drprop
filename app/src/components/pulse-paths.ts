/**
 * Skia paths for the Pulse Roof line, built from the shared brand forms so the
 * app draws the same beat and roof as the website (brief §5.7).
 * All forms share the same vertex count, so Skia can interpolate between them.
 */
import { ecgShape } from '@drprop/brand/pulse/forms';
import { roofPoints, type RoofOptions } from '@drprop/brand/pulse';
import { Skia, type SkPath } from '@shopify/react-native-skia';

const SAMPLES = 180;

export interface PulseFrame {
  width: number;
  /** Apex height in px. */
  height: number;
  /** Baseline y in px. */
  baseline: number;
  roof?: RoofOptions;
}

function roofY(x: number, roof: RoofOptions) {
  const pts = roofPoints(roof);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}

function xs(roof: RoofOptions): number[] {
  // Evenly spaced, plus the roof corners so the ridge stays sharp.
  const set = new Set<number>(roofPoints(roof).map(([x]) => x));
  for (let i = 0; i <= SAMPLES; i++) set.add(i / SAMPLES);
  return [...set].sort((a, b) => a - b);
}

function toPath(points: [number, number][]): SkPath {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return Skia.Path.MakeFromSVGString(d)!;
}

/** Flat, beat and roof forms for the same frame. */
export function pulseForms(frame: PulseFrame) {
  const roof = { apex: 0.62, halfSpan: 0.16, dip: 0.14, ...frame.roof };
  const x = xs(roof);
  const at = (fn: (u: number) => number) =>
    toPath(x.map((u) => [u * frame.width, frame.baseline - fn(u) * frame.height] as [number, number]));
  return {
    flat: at(() => 0),
    beat: at((u) => ecgShape(u, roof.apex!, frame.width)),
    roof: at((u) => roofY(u, roof)),
  };
}
