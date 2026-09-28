/**
 * Builds the logo SVGs with the wordmark converted to outlines, so the files render
 * the same everywhere (web, app, reels, print) without the font installed.
 *
 * Outputs to brand/logo/:
 *   pulse-roof.svg   the line alone
 *   logo.svg         line + DR. PROP
 *   logo-lockup.svg  line + DR. PROP + PROPERTY CLINIC
 *   favicon.svg      heavier line for 16–32px, follows the OS colour scheme
 *
 * Colours use currentColor with a default `color` attribute of ink, so an <img>
 * shows ink and an inline copy takes the surrounding text colour.
 *
 * Run: npm run brand:build
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';
import { color } from '../tokens/tokens.ts';
import { PULSE_STROKE, roofPath } from '../pulse/pulse-roof.ts';

const require = createRequire(import.meta.url);
const loadFont = (spec: string) => {
  const buf = readFileSync(require.resolve(spec));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

const serif = loadFont('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff');
const sans = loadFont('@fontsource/geist/files/geist-latin-400-normal.woff');

const r = (n: number) => Math.round(n * 100) / 100;
const out = (name: string) => new URL(`../logo/${name}`, import.meta.url);

/** Serialise path commands ourselves: opentype.js 2.0's toPathData emits NaN for some curves. */
function pathData(path: opentype.Path): string {
  return path.commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${r(c.x)} ${r(c.y)}`;
        case 'Q':
          return `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`;
        case 'C':
          return `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join('');
}

interface Set {
  d: string;
  width: number;
}

/** Lay out text as one outlined path with fixed tracking (in px). */
function setText(font: opentype.Font, text: string, size: number, tracking: number, x: number, baseline: number): Set {
  const scale = size / font.unitsPerEm;
  // Per-character lookup: plain caps need no shaping, and opentype.js 2.0 cannot
  // apply some of the fonts' contextual lookups.
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  let pen = x;
  const parts: string[] = [];
  glyphs.forEach((g, i) => {
    parts.push(pathData(g.getPath(pen, baseline, size)));
    pen += (g.advanceWidth ?? 0) * scale;
    const next = glyphs[i + 1];
    if (next) pen += font.getKerningValue(g, next) * scale + tracking;
  });
  return { d: parts.join(''), width: pen - x };
}

function capHeight(font: opentype.Font): number {
  const os2 = font.tables.os2 as { sCapHeight?: number } | undefined;
  return (os2?.sCapHeight ?? font.unitsPerEm * 0.7) / font.unitsPerEm;
}

/* ---------- Proportions (px in a 1× logo) ---------- */

const CAP = 20; // wordmark cap height
const wordSize = CAP / capHeight(serif);
const tracking = wordSize * 0.18; // §1.2: wide tracking
const APEX = 28; // roof apex above the shared baseline
const LINE_W = 76; // pulse line length
const GAP = 16; // line → wordmark
const PAD = 2; // stroke breathing room
const DIP = 0.14; // Q/S dip, fraction of apex

const top = PAD;
const baseline = top + APEX;
const lineFrame = { x: PAD, width: LINE_W, height: APEX, baseline };
const linePath = roofPath(lineFrame, { apex: 0.56, halfSpan: 0.21, dip: DIP });

const wordX = PAD + LINE_W + GAP;
const word = setText(serif, 'DR. PROP', wordSize, tracking, wordX, baseline);
const markWidth = wordX + word.width + PAD;
const belowLine = APEX * DIP + PAD;

const stroke = `fill="none" stroke="currentColor" stroke-width="${PULSE_STROKE.width}" stroke-linecap="${PULSE_STROKE.linecap}" stroke-linejoin="${PULSE_STROKE.linejoin}" stroke-miterlimit="${PULSE_STROKE.miterlimit}"`;

const svg = (w: number, h: number, title: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}" color="${color.ink}" role="img" aria-label="${title}">
  <title>${title}</title>
${body}
</svg>
`;

/* ---------- logo.svg ---------- */
{
  const h = baseline + belowLine;
  writeFileSync(
    out('logo.svg'),
    svg(markWidth, h, 'DR. PROP', `  <path d="${linePath}" ${stroke}/>\n  <path d="${word.d}" fill="currentColor"/>`),
  );
}

/* ---------- logo-lockup.svg ---------- */
{
  // PROPERTY CLINIC: small sans, tracked out to span exactly the wordmark width.
  const text = 'PROPERTY CLINIC';
  const subCap = CAP * 0.34;
  const subSize = subCap / capHeight(sans);
  const natural = setText(sans, text, subSize, 0, 0, 0).width;
  const subTracking = (word.width - natural) / (text.length - 1);
  const subBaseline = baseline + CAP * 0.62 + subCap;
  const sub = setText(sans, text, subSize, subTracking, wordX, subBaseline);
  const h = subBaseline + PAD;
  writeFileSync(
    out('logo-lockup.svg'),
    svg(
      markWidth,
      h,
      'DR. PROP — Property Clinic',
      `  <path d="${linePath}" ${stroke}/>\n  <path d="${word.d}" fill="currentColor"/>\n  <path d="${sub.d}" fill="currentColor"/>`,
    ),
  );
}

/* ---------- pulse-roof.svg ---------- */
{
  const w = 240;
  const apex = 56;
  const b = PAD + apex;
  const d = roofPath({ x: 0, width: w, height: apex, baseline: b }, { apex: 0.5, halfSpan: 0.13, dip: DIP });
  writeFileSync(out('pulse-roof.svg'), svg(w, b + apex * DIP + PAD, 'Pulse Roof', `  <path d="${d}" ${stroke}/>`));
}

/* ---------- favicon.svg ---------- */
{
  const d = roofPath({ x: 2, width: 28, height: 15, baseline: 22 }, { apex: 0.5, halfSpan: 0.26, dip: 0.18 });
  writeFileSync(
    out('favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>path{stroke:${color.ink}}@media (prefers-color-scheme:dark){path{stroke:${color.nightText}}}</style>
  <path d="${d}" fill="none" stroke-width="2.4" stroke-linejoin="miter" stroke-miterlimit="10"/>
</svg>
`,
  );
}

console.log('wrote logo/*.svg');
