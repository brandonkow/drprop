/**
 * Chinese web fonts cut down to the characters a page actually shows.
 *
 * Fontsource ships Noto Serif SC / Noto Sans SC as ~100 unicode-range slices of
 * ~30 KB each; the Chinese landing page touches ~18 of them (~650 KB). Pages here
 * are static, so the build subsets each touched slice to the exact characters
 * used (harfbuzz via subset-font) and writes @font-face rules whose
 * unicode-range lists only those characters. Result: a few KB per face.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);

export const CJK_FACES = {
  serif: '@fontsource/noto-serif-sc/300.css',
  sans: '@fontsource/noto-sans-sc/400.css',
} as const;

/** Latin, digits and general punctuation are drawn by Instrument Serif / Geist. */
const FIRST_CJK = 0x2e80;

export function parseUnicodeRange(range: string): [number, number][] {
  return range.split(',').map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
    const lo = parseInt(a!, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
}

export function cjkCodepoints(text: string): Set<number> {
  const set = new Set<number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= FIRST_CJK) set.add(cp);
  }
  return set;
}

const hex = (cp: number) => `U+${cp.toString(16)}`;

export interface CjkBuildOptions {
  /** Characters set in the display face (headings). */
  serifText: string;
  /** Characters set in the body face (everything else; a superset is fine). */
  sansText: string;
  /** Directory for the subset .woff2 files. */
  outDir: string;
  /** Maps a written font file path to the url() used in the CSS. */
  toUrl: (absolutePath: string) => string;
}

export interface CjkBuildResult {
  css: string;
  files: number;
  bytes: number;
  slicesTouched: number;
  slicesTotal: number;
}

export async function buildCjkFonts(o: CjkBuildOptions): Promise<CjkBuildResult> {
  mkdirSync(o.outDir, { recursive: true });
  const rules: string[] = [];
  let bytes = 0;
  let slicesTotal = 0;
  for (const [face, spec] of Object.entries(CJK_FACES)) {
    const needed = cjkCodepoints(face === 'serif' ? o.serifText : o.sansText);
    const cssFile = require.resolve(spec);
    const css = readFileSync(cssFile, 'utf8');
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      slicesTotal++;
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
      const woff2 = /url\(([^)]+\.woff2)\)/.exec(block)?.[1];
      if (!range || !woff2) continue;
      const ranges = parseUnicodeRange(range);
      const chars = [...needed].filter((cp) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi)).sort((a, b) => a - b);
      if (chars.length === 0) continue;
      const source = readFileSync(join(dirname(cssFile), woff2));
      const subset = await subsetFont(source, String.fromCodePoint(...chars), { targetFormat: 'woff2' });
      const out = join(o.outDir, basename(woff2));
      writeFileSync(out, subset);
      bytes += subset.length;
      rules.push(
        block
          .replace(/src:[^;]+;/, `src: url(${o.toUrl(out)}) format('woff2');`)
          .replace(/unicode-range:[^;]+;/, `unicode-range: ${chars.map(hex).join(',')};`),
      );
    }
  }
  return { css: rules.join('\n'), files: rules.length, bytes, slicesTouched: rules.length, slicesTotal };
}
