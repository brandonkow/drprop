/**
 * Episode data checks: a new R2 case or R5 month is just a JSON file, so the
 * file itself must be complete in all three languages.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateMarket } from '../src/data/validate';
import { FRAME, safeRect } from '../src/layout';

const dir = (p: string) => fileURLToPath(new URL(`../src/data/${p}/`, import.meta.url));
const load = (p: string) =>
  readdirSync(dir(p))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, JSON.parse(readFileSync(dir(p) + f, 'utf8'))] as const);

const LANGS = ['en', 'zh', 'ms'] as const;

describe('case episodes (R2)', () => {
  it.each(load('cases'))('%s is complete in three languages', (_, ep) => {
    expect(['terrace', 'condo', 'bungalow']).toContain(ep.houseType);
    expect(['roof', 'facade', 'structure', 'land']).toContain(ep.highlight);
    const counts = LANGS.map((l) => {
      expect(ep[l].hook.trim()).not.toBe('');
      ep[l].lines.forEach((line: string) => expect(line.trim()).not.toBe(''));
      return ep[l].lines.length;
    });
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeGreaterThanOrEqual(3);
    expect(counts[0]).toBeLessThanOrEqual(6);
  });
});

describe('market months (R5)', () => {
  it.each(load('market'))('%s has a source, a date and at least four points', (_, m) => {
    expect(typeof m.sample).toBe('boolean');
    expect(m.source.trim()).not.toBe('');
    expect(m.date.trim()).not.toBe('');
    LANGS.forEach((l) => expect(m.label[l].trim()).not.toBe(''));
    expect(m.series.length).toBeGreaterThanOrEqual(4);
    m.series.forEach((p: { value: number }) => expect(Number.isFinite(p.value)).toBe(true));
  });
});

describe('market provenance (§9.7)', () => {
  it.each(load('market'))('%s is either marked sample or fully sourced', (file, m) => {
    expect(() => validateMarket(file.replace(/\.json$/, ''), m)).not.toThrow();
    if (!m.sample) expect(m.provenance.url).toMatch(/^https:\/\//);
  });

  it('refuses observed data without a source, and duplicate or negative points', () => {
    const base = { sample: false, source: 's', date: 'd', unit: 'u', label: { en: 'a', zh: 'a', ms: 'a' } };
    const series = ['1', '2', '3', '4'].map((label, i) => ({ label, value: i }));
    expect(() => validateMarket('x', { ...base, series })).toThrow(/provenance/);
    expect(() => validateMarket('x', { ...base, sample: true, series: [...series, { label: '1', value: 5 }] })).toThrow(/unique/);
    expect(() => validateMarket('x', { ...base, sample: true, series: [...series, { label: '9', value: -1 }] })).toThrow(/negative/);
    expect(() =>
      validateMarket('x', {
        ...base,
        series,
        provenance: { document: 'Report', url: 'http://insecure', page: '1', retrieved: '2026-10-07', sha256: 'a'.repeat(64) },
      }),
    ).toThrow(/https/);
  });
});

describe('safe zones (§9.5)', () => {
  it('9:16 leaves the ~950 × 980 centre from the brief', () => {
    const s = safeRect('9x16');
    expect(FRAME['9x16']).toEqual({ width: 1080, height: 1920 });
    expect([s.width, s.height]).toEqual([950, 980]);
    expect(s.y).toBe(270);
  });
});
