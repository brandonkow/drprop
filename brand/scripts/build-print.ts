/**
 * Print files from brand/print/ (needs Playwright's Chromium):
 *
 *   print/out/diagnosis-report-{en,zh,ms}.pdf   A4, the sample diagnosis (brief §3.2)
 *   print/out/diagnosis-card-{en,zh,ms}.pdf     A6 letterpress card, front and back (§4.4)
 *   print/out/fee-plate.pdf                     the door plate, 300 × 400 mm (§6.1)
 *   web/public/samples/diagnosis-{lang}.pdf     the sample report, linked from the website's fee section
 *   app/assets/samples/diagnosis-{lang}.pdf     the same, opened from the app preview's sample record
 *
 *     npx tsx scripts/build-print.ts            (from brand/)
 *     npx tsx scripts/build-print.ts --preview <dir>   also PNG previews of every page
 *
 * For a real client, fill a Diagnosis (print/diagnosis.ts) and call reportHtml/cardHtml.
 * The card: letterpress in one ink on 600 gsm cotton; the printer adds bleed. The plate:
 * one colour, etched into brushed bronze.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { LOGO } from '../logo/logo-paths.ts';
import { SAMPLE, type Lang } from '../print/diagnosis.ts';
import { cardHtml, plateHtml, reportHtml } from '../print/render.ts';
import { roofPath } from '../pulse/pulse-roof.ts';

const require = createRequire(import.meta.url);
const css = (pkg: string) => pathToFileURL(require.resolve(pkg)).href;
const out = fileURLToPath(new URL('../print/out/', import.meta.url));
const LANGS: Lang[] = ['en', 'zh', 'ms'];

const fonts = (lang: Lang) => ({
  css: [
    css('@fontsource/instrument-serif/400.css'),
    css('@fontsource/geist/400.css'),
    css('@fontsource/geist-mono/400.css'),
    ...(lang === 'zh' ? [css('@fontsource/noto-serif-sc/300.css'), css('@fontsource/noto-sans-sc/400.css')] : []),
  ],
});
const allFonts = { css: [...fonts('zh').css] };

const logo = readFileSync(fileURLToPath(new URL('../logo/logo.svg', import.meta.url)), 'utf8')
  .replace(/<title>.*?<\/title>/s, '')
  .replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"');
const wordmark = `<svg viewBox="92 8 134 24" aria-hidden="true"><path d="${LOGO.wordmark}" fill="currentColor"/></svg>`;
const line = roofPath({ width: 1000, height: 100, baseline: 108 }, { apex: 0.5, halfSpan: 0.12, dip: 0.14 });

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const tmp = join(tmpdir(), 'drprop-print.html');
const previewAt = process.argv.indexOf('--preview');
const previewDir = previewAt > 0 ? process.argv[previewAt + 1] : undefined;

/** Load from a file so the local fonts load, wait for them, print. */
async function pdf(html: string, file: string, size: { width: string; height: string }) {
  writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(out, file), ...size, printBackground: true, preferCSSPageSize: true });
  console.log(`print → print/out/${file}`);
  if (previewDir) {
    mkdirSync(previewDir, { recursive: true });
    const px = (mm: string) => Math.round((parseFloat(mm) / 25.4) * 96);
    await page.setViewportSize({ width: px(size.width), height: px(size.height) });
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: join(previewDir, file.replace(/\.pdf$/, '.png')), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
  }
}

const samples = fileURLToPath(new URL('../../web/public/samples/', import.meta.url));
const appSamples = fileURLToPath(new URL('../../app/assets/samples/', import.meta.url));
for (const dir of [samples, appSamples]) mkdirSync(dir, { recursive: true });
for (const lang of LANGS) {
  await pdf(reportHtml(SAMPLE[lang], lang, fonts(lang), logo), `diagnosis-report-${lang}.pdf`, { width: '210mm', height: '297mm' });
  for (const dir of [samples, appSamples]) copyFileSync(join(out, `diagnosis-report-${lang}.pdf`), join(dir, `diagnosis-${lang}.pdf`));
  await pdf(cardHtml(SAMPLE[lang], lang, fonts(lang), line, wordmark), `diagnosis-card-${lang}.pdf`, { width: '148mm', height: '105mm' });
}
await pdf(plateHtml(allFonts, { opens: '10:00', closes: '20:00' }, wordmark), 'fee-plate.pdf', { width: '300mm', height: '400mm' });

await browser.close();
rmSync(tmp, { force: true });
