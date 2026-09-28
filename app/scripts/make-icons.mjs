/**
 * Renders the app icons and splash images from the brand Pulse Roof line.
 * Needs Playwright (not a project dependency):
 *   npx -p playwright node scripts/make-icons.mjs [path-to-chromium]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const { color } = { color: { bone: '#F4F1EA', ink: '#1C1B19', night: '#141412', nightText: '#EDE9E1' } };
const pulse = readFileSync(here('../../brand/logo/pulse-roof.svg'), 'utf8').match(/<path d="([^"]+)"/)[1];

/** Pulse Roof line centred in a square, `span` = share of the width it covers. */
const svg = ({ size, bg, stroke, span, weight }) => {
  const w = 240; // pulse-roof.svg viewBox width
  const s = (size * span) / w;
  const tx = (size - w * s) / 2;
  const ty = size / 2 - 40 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}
    <g transform="translate(${tx} ${ty}) scale(${s})">
      <path d="${pulse}" fill="none" stroke="${stroke}" stroke-width="${weight / s}" stroke-linejoin="miter" stroke-miterlimit="10"/>
    </g></svg>`;
};

const targets = [
  ['icon.png', { size: 1024, bg: color.bone, stroke: color.ink, span: 0.78, weight: 26 }],
  ['android-icon-foreground.png', { size: 1024, stroke: color.ink, span: 0.52, weight: 24 }],
  ['android-icon-monochrome.png', { size: 1024, stroke: '#000000', span: 0.52, weight: 24 }],
  ['splash-icon.png', { size: 512, stroke: color.ink, span: 0.9, weight: 5 }],
  ['splash-icon-dark.png', { size: 512, stroke: color.nightText, span: 0.9, weight: 5 }],
  ['favicon.png', { size: 48, bg: color.bone, stroke: color.ink, span: 0.86, weight: 3 }],
];

const browser = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {});
const page = await browser.newPage();
for (const [file, opts] of targets) {
  const vp = Math.max(opts.size, 200);
  await page.setViewportSize({ width: vp, height: vp });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(opts)}</body>`);
  await page.screenshot({
    path: here(`../assets/${file}`),
    clip: { x: 0, y: 0, width: opts.size, height: opts.size },
    omitBackground: true,
  });
  console.log('wrote assets/' + file);
}
await browser.close();
