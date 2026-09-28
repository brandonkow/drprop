import { describe, expect, it } from 'vitest';
import { beatEnvelope, BEAT_PERIOD, ecgShape, ECG, pulseGeometry, resample, SKYLINES } from '../pulse/forms.ts';
import { roofPoints } from '../pulse/pulse-roof.ts';

describe('resample', () => {
  it.each(Object.entries(SKYLINES))('%s skyline keeps every corner', (_, poly) => {
    const out = resample(poly, 512);
    expect(out).toHaveLength(512);
    for (const [x, y] of poly) {
      expect(out.some(([ox, oy]) => Math.abs(ox - x) < 1e-9 && Math.abs(oy - y) < 1e-9)).toBe(true);
    }
    expect(out[0]).toEqual(poly[0]);
    expect(out.at(-1)).toEqual(poly.at(-1));
  });

  it('refuses too few points', () => {
    expect(() => resample(SKYLINES.wide, 10)).toThrow();
  });
});

describe('pulseGeometry', () => {
  const roof = { apex: 0.7, halfSpan: 0.075, dip: 0.14 };
  const g = pulseGeometry(512, roof, 'wide');

  it('has exactly the requested vertex count', () => {
    expect(g.base).toHaveLength(1024);
    expect(g.sky).toHaveLength(1024);
  });

  it('x rises left to right from 0 to 1', () => {
    const xs = Array.from({ length: g.count }, (_, i) => g.base[i * 2]!);
    expect(xs[0]).toBe(0);
    expect(xs.at(-1)).toBe(1);
    xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(xs[i]!));
  });

  it('keeps the roof corners, so the ridge is sharp', () => {
    const at = new Map(Array.from({ length: g.count }, (_, i) => [g.base[i * 2]!, g.base[i * 2 + 1]!]));
    for (const [x, y] of roofPoints(roof)) expect(at.get(Math.fround(x))).toBeCloseTo(y, 5);
  });
});

describe('beat', () => {
  it('peaks at the apex with the R wave', () => {
    expect(ecgShape(0.7, 0.7, 1440)).toBeCloseTo(ECG.r.amp, 1);
    expect(ecgShape(0.1, 0.7, 1440)).toBeCloseTo(0, 5);
  });

  it('rests between beats and repeats every period', () => {
    expect(beatEnvelope(0)).toBeCloseTo(ECG.rest, 5);
    expect(beatEnvelope(ECG.rise)).toBeCloseTo(1, 5);
    expect(beatEnvelope(BEAT_PERIOD * 0.99)).toBeCloseTo(ECG.rest, 2);
    expect(beatEnvelope(ECG.rise + BEAT_PERIOD * 3)).toBeCloseTo(1, 5);
  });
});
