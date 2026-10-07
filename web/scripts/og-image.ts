/**
 * The share cards (og:image) shown when someone sends the site on WhatsApp or
 * Facebook: 1200×630, one per language, from the same copy, fees, fonts and
 * Pulse Roof as the site. Writes web/public/og/og-{en,zh,ms}.png.
 *
 *     npx tsx scripts/og-image.ts      (from web/; needs Playwright's Chromium)
 *
 * Re-run after changing the headline, the fees or the logo.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { bands } from '@drprop/brand/pricing';
import { roofPath } from '@drprop/brand/pulse';
import { color } from '@drprop/brand/tokens';
import { formatRM } from '../src/features/money.ts';
import { dicts, langs } from '../src/i18n/index.ts';

const W = 1200;
const H = 630;
const require = createRequire(import.meta.url);
const css = (pkg: string) => pathToFileURL(require.resolve(pkg)).href;
const out = fileURLToPath(new URL('../public/og/', import.meta.url));
const logo = readFileSync(fileURLToPath(new URL('../../brand/logo/logo.svg', import.meta.url)), 'utf8')
  .replace(/<title>.*?<\/title>/s, '')
  .replace(/ width="[^"]*" height="[^"]*"/, ' width="300"');

const fees = bands.map((b) => b.fee);
const line = roofPath({ width: W, height: 70, baseline: 92 }, { apex: 0.78, halfSpan: 0.06, dip: 0.14 });

function html(lang: (typeof langs)[number]): string {
  const t = dicts[lang];
  const zh = lang === 'zh';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
  <link rel="stylesheet" href="${css('@fontsource/instrument-serif/400.css')}">
  <link rel="stylesheet" href="${css('@fontsource/geist/400.css')}">
  <link rel="stylesheet" href="${css('@fontsource/geist-mono/400.css')}">
  ${zh ? `<link rel="stylesheet" href="${css('@fontsource/noto-serif-sc/300.css')}"><link rel="stylesheet" href="${css('@fontsource/noto-sans-sc/400.css')}">` : ''}
  <style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: ${color.bone}; color: ${color.ink}; overflow: hidden; }
    .card { position: relative; width: ${W}px; height: ${H}px; box-sizing: border-box; padding: 64px 80px; }
    .logo { color: ${color.ink}; }
    h1 { margin: 64px 0 0; max-width: 940px; font: 400 ${zh ? 76 : 88}px/1.02 ${zh ? "'Noto Serif SC'" : "'Instrument Serif'"}, serif;
         font-weight: ${zh ? 300 : 400}; letter-spacing: ${zh ? '0.02em' : '-0.01em'}; }
    p { margin: 28px 0 0; max-width: 820px; font: 400 26px/1.45 'Geist', ${zh ? "'Noto Sans SC', " : ''}sans-serif; color: ${color.stoneText}; }
    .fees { margin-top: 18px; font-family: 'Geist Mono', ${zh ? "'Noto Sans SC', " : ''}monospace; color: ${color.ink}; }
    svg.pulse { position: absolute; left: 0; bottom: 36px; }
  </style></head><body><div class="card">
    <div class="logo">${logo}</div>
    <h1>${t.hero.title}</h1>
    <p>${t.hero.sub}</p>
    <p class="fees">${t.fee.label} ${formatRM(Math.min(...fees))} – ${formatRM(Math.max(...fees))}</p>
    <svg class="pulse" width="${W}" height="100" viewBox="0 0 ${W} 100"><path d="${line}" fill="none" stroke="${color.ink}" stroke-width="2.5" stroke-linejoin="miter"/></svg>
  </div></body></html>`;
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
// A file page, so it may load the local font files.
const tmp = join(tmpdir(), 'drprop-og.html');
for (const lang of langs) {
  writeFileSync(tmp, html(lang));
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}og-${lang}.png`, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`og → public/og/og-${lang}.png`);
}
await browser.close();
rmSync(tmp, { force: true });
