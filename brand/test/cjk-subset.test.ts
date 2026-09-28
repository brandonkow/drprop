import { mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCjkFonts, cjkCodepoints, parseUnicodeRange } from '../fonts/cjk-subset.ts';

describe('cjk subset', () => {
  it('parses unicode ranges', () => {
    expect(parseUnicodeRange('U+4e00-4e0f, U+3001')).toEqual([
      [0x4e00, 0x4e0f],
      [0x3001, 0x3001],
    ]);
  });

  it('ignores Latin and general punctuation', () => {
    expect([...cjkCodepoints('RM 399 — 诊金。')]).toEqual([0x8bca, 0x91d1, 0x3002]);
  });

  it('writes tiny woff2 subsets covering exactly the characters used', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'cjk-'));
    const r = await buildCjkFonts({
      serifText: '签约之前，先来问诊。',
      sansText: '独立房产诊断。不卖房，不抽佣。',
      outDir,
      toUrl: (p) => p,
    });
    expect(r.slicesTotal).toBeGreaterThan(150);
    expect(r.files).toBeGreaterThan(0);
    const sizes = readdirSync(outDir).map((f) => statSync(join(outDir, f)).size);
    expect(Math.max(...sizes)).toBeLessThan(12_000);
    expect(r.css).toContain("font-family: 'Noto Serif SC'");
    expect(r.css).toContain("font-family: 'Noto Sans SC'");
    expect(r.css).toContain('U+7b7e'); // 签
    expect(r.css).not.toContain('.woff)');
  }, 30_000);

  it('writes nothing for Latin-only text', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'cjk-'));
    const r = await buildCjkFonts({ serifText: 'Before', sansText: 'you sign', outDir, toUrl: (p) => p });
    expect(r.files).toBe(0);
  });
});
