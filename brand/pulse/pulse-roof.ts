/**
 * The Pulse Roof (brief §5.7): one ECG line whose peak folds into a roof.
 *
 * Shapes are defined in unit space: x ∈ [0, 1] left→right, y is height above the
 * baseline as a fraction of the apex height (1 = apex, negative = below baseline).
 * This file only holds the static roof form used by the logo and the no-WebGL
 * fallback. The animated flat → beat → roof → skyline forms come in step 3.
 */

export type UnitPoint = readonly [x: number, y: number];

/** Where the roof sits along the line and how wide it spans. */
export interface RoofOptions {
  /** Apex x position, 0–1. */
  apex?: number;
  /** Half the roof span as a fraction of the line width. */
  halfSpan?: number;
  /** Depth of the Q and S dips below the baseline, fraction of apex height. */
  dip?: number;
  /** Horizontal width of each dip as a fraction of the half span. */
  dipWidth?: number;
}

export const ROOF_DEFAULTS: Required<RoofOptions> = {
  apex: 0.5,
  halfSpan: 0.1,
  dip: 0.14,
  dipWidth: 0.34,
};

/** Unit-space vertices of the roof form. */
export function roofPoints(options: RoofOptions = {}): UnitPoint[] {
  const { apex, halfSpan, dip, dipWidth } = { ...ROOF_DEFAULTS, ...options };
  const d = halfSpan * dipWidth;
  const left = apex - halfSpan;
  const right = apex + halfSpan;
  return [
    [0, 0],
    [left - d, 0],
    [left, -dip],
    [apex, 1],
    [right, -dip],
    [right + d, 0],
    [1, 0],
  ];
}

export interface FrameOptions {
  width: number;
  /** Apex height in px above the baseline. */
  height: number;
  /** Baseline y in px (SVG coordinates, y down). */
  baseline: number;
  /** x offset in px. */
  x?: number;
}

/** Map unit points into SVG pixel space. */
export function toPixels(points: readonly UnitPoint[], frame: FrameOptions): [number, number][] {
  const x0 = frame.x ?? 0;
  return points.map(([x, y]) => [x0 + x * frame.width, frame.baseline - y * frame.height]);
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Polyline → SVG path `d` attribute. */
export function toSvgPath(points: readonly (readonly [number, number])[]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join(' ');
}

/** Convenience: roof path for a given frame. */
export function roofPath(frame: FrameOptions, options?: RoofOptions): string {
  return toSvgPath(toPixels(roofPoints(options), frame));
}

/** Stroke settings every rendering of the line must share. */
export const PULSE_STROKE = {
  width: 1.5,
  linecap: 'butt',
  linejoin: 'miter',
  miterlimit: 10,
} as const;
