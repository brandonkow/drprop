/**
 * The four forms of the living Pulse Roof line (brief §7.3 Layer B):
 *
 *   0.00  flat      a resting ECG trace
 *   0.25  beat      a heartbeat every 1.2s
 *   0.50  roof      the beat's peak folds into a single roof
 *   1.00  skyline   the line unfolds into an abstract skyline
 *
 * Coordinates are unit space as in pulse-roof.ts: x ∈ [0, 1] across the line,
 * y in apex heights above the baseline. The web shader, the SVG fallback and the
 * Remotion PulseLine all build from these definitions.
 */
import { roofPoints, type RoofOptions, type UnitPoint } from './pulse-roof.ts';

export const FORM = { flat: 0, beat: 0.25, roof: 0.5, skyline: 1 } as const;

/** Seconds between heartbeats. */
export const BEAT_PERIOD = 1.2;

/**
 * One PQRST complex centred on the roof apex. Widths and offsets are in px so the
 * beat looks the same on every screen; amplitudes are in apex heights.
 */
export const ECG = {
  p: { offset: -70, width: 14, amp: 0.1 },
  q: { offset: -16, width: 5, amp: -0.14 },
  /** R is a triangle: sharp like a roof ridge. */
  r: { halfWidth: 12, amp: 1 },
  s: { offset: 18, width: 5, amp: -0.22 },
  t: { offset: 80, width: 22, amp: 0.18 },
  /** Resting level of the complex between beats (fraction of full height). */
  rest: 0.25,
  /** Rise time of each beat, seconds. */
  rise: 0.06,
  /** Exponential decay rate after the peak, per second. */
  decay: 6,
} as const;

const gauss = (dx: number, w: number) => Math.exp(-((dx / w) ** 2));

/** ECG shape at unit x for a line `widthPx` wide, before the time envelope. */
export function ecgShape(x: number, apex: number, widthPx: number): number {
  const dx = (x - apex) * widthPx;
  return (
    ECG.p.amp * gauss(dx - ECG.p.offset, ECG.p.width) +
    ECG.q.amp * gauss(dx - ECG.q.offset, ECG.q.width) +
    ECG.r.amp * Math.max(0, 1 - Math.abs(dx) / ECG.r.halfWidth) +
    ECG.s.amp * gauss(dx - ECG.s.offset, ECG.s.width) +
    ECG.t.amp * gauss(dx - ECG.t.offset, ECG.t.width)
  );
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Beat envelope at time t (seconds): a quick rise, then decay back to rest. */
export function beatEnvelope(t: number): number {
  const tt = ((t % BEAT_PERIOD) + BEAT_PERIOD) % BEAT_PERIOD;
  const pulse = smoothstep(0, ECG.rise, tt) * Math.exp(-Math.max(tt - ECG.rise, 0) * ECG.decay);
  return ECG.rest + (1 - ECG.rest) * pulse;
}

/* ------------------------------------------------------------ skyline */

export type SkylineVariant = 'wide' | 'narrow';

/**
 * Abstract skylines: terrace houses, two condo blocks, a shophouse row, the brand
 * roof as a house, a bungalow. Generic shapes only — no real buildings (§7.3, §9.3).
 */
export const SKYLINES: Record<SkylineVariant, UnitPoint[]> = {
  wide: [
    [0, 0], [0.05, 0],
    // terrace row: six gables
    [0.05, 0.32], [0.0675, 0.5], [0.085, 0.32], [0.1025, 0.5], [0.12, 0.32], [0.1375, 0.5],
    [0.155, 0.32], [0.1725, 0.5], [0.19, 0.32], [0.2075, 0.5], [0.225, 0.32], [0.225, 0],
    [0.27, 0],
    // condo A with a rooftop box
    [0.27, 1.2], [0.285, 1.2], [0.285, 1.32], [0.305, 1.32], [0.305, 1.2], [0.32, 1.2], [0.32, 0],
    [0.33, 0],
    // condo B
    [0.33, 0.92], [0.37, 0.92], [0.37, 0],
    [0.42, 0],
    // shophouse row, stepped parapets
    [0.42, 0.55], [0.46, 0.55], [0.46, 0.6], [0.5, 0.6], [0.5, 0.55], [0.54, 0.55], [0.54, 0.62], [0.58, 0.62], [0.58, 0],
    [0.655, 0],
    // the brand roof, now a house with eaves
    [0.655, 0.42], [0.645, 0.42], [0.7, 1], [0.755, 0.42], [0.745, 0.42], [0.745, 0],
    [0.8, 0],
    // bungalow with a hipped roof
    [0.8, 0.3], [0.79, 0.3], [0.83, 0.52], [0.89, 0.52], [0.93, 0.3], [0.92, 0.3], [0.92, 0],
    [1, 0],
  ],
  narrow: [
    [0, 0], [0.04, 0],
    // terrace row: three gables
    [0.04, 0.3], [0.08, 0.5], [0.12, 0.3], [0.16, 0.5], [0.2, 0.3], [0.24, 0.5], [0.28, 0.3], [0.28, 0],
    [0.32, 0],
    // condo
    [0.32, 1.05], [0.34, 1.05], [0.34, 1.12], [0.4, 1.12], [0.4, 1.05], [0.42, 1.05], [0.42, 0],
    [0.53, 0],
    // the brand roof as a house
    [0.53, 0.4], [0.51, 0.4], [0.64, 1], [0.77, 0.4], [0.75, 0.4], [0.75, 0],
    [0.8, 0],
    // bungalow
    [0.8, 0.28], [0.79, 0.28], [0.83, 0.46], [0.93, 0.46], [0.97, 0.28], [0.96, 0.28], [0.96, 0],
    [1, 0],
  ],
};

/**
 * Resample a polyline to exactly `count` points, keeping every corner.
 * Points are spread by arc length, with y scaled by `yWeight` (unit y is in apex
 * heights, which are much larger than unit x).
 */
export function resample(poly: readonly UnitPoint[], count: number, yWeight = 0.08): UnitPoint[] {
  const segs = poly.slice(1).map((p, i) => {
    const a = poly[i]!;
    return { a, b: p, len: Math.hypot(p[0] - a[0], (p[1] - a[1]) * yWeight) };
  });
  const total = segs.reduce((s, g) => s + g.len, 0);
  const inner = count - 1 - segs.length; // points beyond the corners
  if (inner < 0) throw new Error(`resample: need at least ${segs.length + 1} points`);
  // Share the extra points by length (largest remainder so the sum is exact).
  const raw = segs.map((g) => (g.len / total) * inner);
  const extra = raw.map(Math.floor);
  let left = inner - extra.reduce((s, n) => s + n, 0);
  raw
    .map((r, i) => [r - Math.floor(r), i] as const)
    .sort((x, y) => y[0] - x[0])
    .forEach(([, i]) => {
      if (left > 0) {
        extra[i]!++;
        left--;
      }
    });
  const out: UnitPoint[] = [poly[0]!];
  segs.forEach((g, i) => {
    const n = extra[i]! + 1;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([g.a[0] + (g.b[0] - g.a[0]) * t, g.a[1] + (g.b[1] - g.a[1]) * t]);
    }
  });
  return out;
}

/* ------------------------------------------------------------ geometry */

export interface PulseGeometry {
  count: number;
  /** Per vertex: x, roof y. Flat and beat forms are computed from x. */
  base: Float32Array;
  /** Per vertex: skyline x, skyline y. */
  sky: Float32Array;
  apex: number;
}

/**
 * Vertex data for the animated line. Vertex i of every form is paired, so the
 * shader can blend forms per vertex.
 */
export function pulseGeometry(count: number, roof: RoofOptions, variant: SkylineVariant): PulseGeometry {
  const roofPoly = roofPoints(roof);
  // Evenly spaced x plus the roof's corners, so the ridge stays sharp.
  const corners = roofPoly.map(([x]) => x);
  let sortedX: number[] = [];
  for (let m = count - corners.length + 2, tries = 0; tries < 50; tries++) {
    const set = new Set<number>(corners);
    for (let i = 0; i < m; i++) set.add(i / (m - 1));
    sortedX = [...set].sort((a, b) => a - b);
    if (sortedX.length === count) break;
    m += sortedX.length < count ? 1 : -1;
  }
  if (sortedX.length !== count) throw new Error('pulseGeometry: could not place vertices');

  const roofY = (x: number) => {
    for (let i = 1; i < roofPoly.length; i++) {
      const [x0, y0] = roofPoly[i - 1]!;
      const [x1, y1] = roofPoly[i]!;
      if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return 0;
  };

  const sky = resample(SKYLINES[variant], count);
  const base = new Float32Array(count * 2);
  const skyArr = new Float32Array(count * 2);
  sortedX.forEach((x, i) => {
    base[i * 2] = x;
    base[i * 2 + 1] = roofY(x);
    skyArr[i * 2] = sky[i]![0];
    skyArr[i * 2 + 1] = sky[i]![1];
  });
  return { count, base, sky: skyArr, apex: roof.apex ?? 0.5 };
}
