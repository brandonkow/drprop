/**
 * Renders every reel in every format (brief §9.5, §10 step 13):
 *   out/{name}-{lang}-{ratio}.mp4      H.264 + AAC, 30 fps, BT.709, −14 LUFS
 *
 * English only by default: the owner's call (2026-10-08). The Chinese and Malay copy stays in
 * the reels, so `--lang en,zh,ms` still renders all three.
 *
 * Every MP4 then goes through scripts/deliver.ts: BT.709 limited range, tagged,
 * and the sound at −14 LUFS with true peak at or below −1 dBTP. Check finished files with
 * `npm run verify:media -w @drprop/reels`.
 *
 * The hero promo (HeroPromo, ~48 s) and the product film (ProductFilm, ~70 s) are
 * English only, 16:9 and 9:16.
 *
 * R2 renders once per data/cases/*.json, R5 once per data/market/*.json, R1 at
 * 7 s and 15 s. Adding an episode = adding a JSON file.
 *
 *   npm run render:all                         # everything
 *   npm run render:all -- --only FeeReveal,CaseOfWeek --lang zh --ratio 9x16
 *   npm run render:all -- --still              # one PNG per job (45% in), for review
 *   npm run render:all -- --still --at 0.2     # …or at other points (0–1, comma-separated)
 *   npm run render:all -- --safe-zone          # burn in the safe-zone overlay (review only)
 *   npm run render:all -- --frames 0-89        # a range, for quick checks (writes …-f0-89.mp4)
 *   npm run render:all -- --skip-existing      # resume a stopped batch: keep finished MP4s
 *
 * The store reveal's 3D is slow without a GPU (about 5 s a frame), and it is the same in every
 * language. So it renders once per format into plates/ (PNG frames, served to the browser from
 * here), and each language draws its text over those frames. A stopped batch resumes at the first
 * missing frame; a format's plates go once its languages are done. If you change the 3D
 * while plates/ holds frames, delete plates/.
 *
 * GPU-less machines: REMOTION_GL=swangle. Custom Chrome: REMOTION_BROWSER=/path.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cpus } from 'node:os';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderFrames, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { deliver } from './deliver.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = (name: string) => value(name)?.split(',').filter(Boolean);

const LANGS = list('lang') ?? ['en'];
const RATIOS = list('ratio') ?? ['9x16', '4x5', '16x9'];
const ONLY = list('only');
const frames = value('frames')?.split('-').map(Number) as [number, number] | undefined;
const still = flag('still');
// --at 0.2 or --at 0.1,0.5,0.9 (several stills per job).
const ats = (value('at') ?? '0.45').split(',').map(Number);
const gl = (process.env.REMOTION_GL ?? value('gl') ?? 'angle') as 'angle' | 'swangle' | 'swiftshader' | 'egl';
const browserExecutable = process.env.REMOTION_BROWSER ?? value('browser') ?? null;
const concurrency = Number(value('concurrency') ?? Math.max(1, Math.floor(cpus().length / 2)));

const jsonIds = (dir: string) =>
  readdirSync(here(`../src/data/${dir}`))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();

interface Job {
  id: string;
  name: string;
  props: Record<string, unknown>;
  /** Limit a job to some languages or formats (the hero promo is English, 16:9 and 9:16). */
  langs?: string[];
  ratios?: string[];
  /** Render the 3D stage once per format and share it across languages (see the top of this file). */
  stage?: boolean;
}

const jobs: Job[] = [
  { id: 'BrandPulse', name: 'brand-pulse-7s', props: { length: 7 } },
  { id: 'BrandPulse', name: 'brand-pulse-15s', props: { length: 15 } },
  ...jsonIds('cases').map((caseId) => ({ id: 'CaseOfWeek', name: `case-${caseId}`, props: { caseId } })),
  { id: 'BeforeYouSign', name: 'before-you-sign', props: {} },
  { id: 'FeeReveal', name: 'fee-reveal', props: {} },
  ...jsonIds('market').map((monthId) => ({ id: 'MarketPulse', name: `market-${monthId}`, props: { monthId } })),
  { id: 'LoungeMoment', name: 'lounge-moment', props: {} },
  { id: 'StoreReveal', name: 'store-reveal', props: {}, stage: true },
  { id: 'MemberCardReveal', name: 'member-card', props: { memberNo: 'PJ-0001' } },
  { id: 'Visit', name: 'visit', props: {}, langs: ['en'] },
  { id: 'HeroPromo', name: 'hero-promo', props: {}, langs: ['en'], ratios: ['16x9', '9x16'] },
  { id: 'ProductFilm', name: 'product-film', props: {}, langs: ['en'], ratios: ['16x9', '9x16'] },
].filter((j) => !ONLY || ONLY.includes(j.id) || ONLY.includes(j.name));

console.log(`bundling… (${jobs.length} reels × ${LANGS.length} languages × ${RATIOS.length} formats)`);
const serveUrl = await bundle({ entryPoint: here('../src/index.ts'), publicDir: here('../../brand') });

const platesDir = here('../plates');
let stageUrl: string | undefined;
/** Serves plates/ to the renderer's browser. */
async function stageServer(): Promise<string> {
  if (stageUrl) return stageUrl;
  const server = createServer((req, res) => {
    const file = join(platesDir, decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname));
    if (!file.startsWith(platesDir + sep) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': 'image/png' });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  server.unref();
  stageUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return stageUrl;
}

/** Renders a job's 3D stage for one format into plates/ (or finishes it) and returns its URL. */
async function renderStage(job: Job, ratio: string): Promise<string> {
  const dir = join(platesDir, `${job.name}-${ratio}`);
  mkdirSync(dir, { recursive: true });
  const inputProps = { ...job.props, lang: 'en', ratio, stageOnly: true };
  const composition = await selectComposition({ serveUrl, id: job.id, inputProps, browserExecutable, chromiumOptions: { gl } });
  const last = composition.durationInFrames - 1;
  // Frames are renamed into place only when written in full, so the first missing one is where to resume.
  let first = 0;
  while (first <= last && existsSync(join(dir, `${first}.png`))) first++;
  if (first <= last) {
    const started = Date.now();
    await renderFrames({
      serveUrl,
      composition,
      inputProps,
      imageFormat: 'png',
      outputDir: null,
      frameRange: [first, last],
      onStart: () => undefined,
      onFrameUpdate: (rendered) => {
        if (rendered % 100 === 0) console.log(`  3D stage ${ratio}: ${first + rendered}/${last + 1} frames`);
      },
      onFrameBuffer: (buffer, frame) => {
        writeFileSync(join(dir, `${frame}.png.tmp`), buffer);
        renameSync(join(dir, `${frame}.png.tmp`), join(dir, `${frame}.png`));
      },
      concurrency,
      browserExecutable,
      chromiumOptions: { gl },
    });
    console.log(`  3D stage ${job.name}-${ratio}: ${last - first + 1} frames (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
  return `${await stageServer()}/${job.name}-${ratio}`;
}

let done = 0;
const langsOf = (j: Job) => LANGS.filter((l) => !j.langs || j.langs.includes(l));
const ratiosOf = (j: Job) => RATIOS.filter((r) => !j.ratios || j.ratios.includes(r));
const total = jobs.reduce((n, j) => n + langsOf(j).length * ratiosOf(j).length, 0);
const usesStage = (job: Job) => job.stage && !still && !frames;
/** A format's plates go once all its languages are done; a run limited to some languages keeps them. */
const dropStage = (job: Job, ratio: string) => {
  if (usesStage(job) && !value('lang')) rmSync(join(platesDir, `${job.name}-${ratio}`), { recursive: true, force: true });
};
for (const job of jobs) {
  const langs = langsOf(job);
  // A shared 3D stage goes format by format: its plates, then each language over them.
  const pairs = usesStage(job)
    ? ratiosOf(job).flatMap((ratio) => langs.map((lang) => [lang, ratio] as const))
    : langs.flatMap((lang) => ratiosOf(job).map((ratio) => [lang, ratio] as const));
  for (const [lang, ratio] of pairs) {
    // Renders go to .part.mp4 and are renamed only when finished, so an existing MP4 is complete.
    if (!still && flag('skip-existing') && existsSync(here(`../out/${job.name}-${lang}-${ratio}.mp4`))) {
      done++;
      console.log(`[${done}/${total}] ${job.name}-${lang}-${ratio}.mp4  kept`);
      if (lang === langs.at(-1)) dropStage(job, ratio);
      continue;
    }
    const stageFrames = usesStage(job) ? await renderStage(job, ratio) : undefined;
    const inputProps = { ...job.props, lang, ratio, showSafeZone: flag('safe-zone'), stageFrames };
    const composition = await selectComposition({
      serveUrl,
      id: job.id,
      inputProps,
      browserExecutable,
      chromiumOptions: { gl },
    });
    // A frame range is a test, never the finished file (--skip-existing would keep it).
    const base = here(`../out/${job.name}-${lang}-${ratio}${frames ? `-f${frames[0]}-${frames[1]}` : ''}`);
    const started = Date.now();
    if (still) {
      for (const at of ats) {
        await renderStill({
          serveUrl,
          composition,
          inputProps,
          frame: Math.floor(composition.durationInFrames * at),
          output: `${base}${value('at') ? `-at${at}` : ''}.png`,
          browserExecutable,
          chromiumOptions: { gl },
        });
      }
    } else {
      await renderMedia({
        serveUrl,
        composition,
        inputProps,
        codec: 'h264',
        audioCodec: 'aac',
        // Silent AAC track when a reel has no audio yet, so every file has one.
        enforceAudioTrack: true,
        crf: 18,
        pixelFormat: 'yuv420p',
        // Remotion's default writes full-range BT.601; deliver() checks and fixes the rest.
        colorSpace: 'bt709',
        frameRange: frames ?? null,
        outputLocation: `${base}.part.mp4`,
        concurrency,
        browserExecutable,
        chromiumOptions: { gl },
      });
      if (!frames) console.log(`  ${deliver(`${base}.part.mp4`) || 'delivered as rendered'}`);
      renameSync(`${base}.part.mp4`, `${base}.mp4`);
    }
    done++;
    console.log(
      `[${done}/${total}] ${job.name}-${lang}-${ratio}${still ? '.png' : '.mp4'}  ${composition.width}×${composition.height}  ${(composition.durationInFrames / composition.fps).toFixed(1)}s  (${((Date.now() - started) / 1000).toFixed(0)}s)`,
    );
    if (lang === langs.at(-1)) dropStage(job, ratio);
  }
}
