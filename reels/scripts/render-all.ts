/**
 * Renders every reel in every language and format (brief §9.5, §10 step 13):
 *   out/{name}-{lang}-{ratio}.mp4      H.264 + AAC, 30 fps
 *
 * R2 renders once per data/cases/*.json, R5 once per data/market/*.json, R1 at
 * 7 s and 15 s. Adding an episode = adding a JSON file.
 *
 *   npm run render:all                         # everything
 *   npm run render:all -- --only FeeReveal,CaseOfWeek --lang zh --ratio 9x16
 *   npm run render:all -- --still              # one PNG per job (45% in), for review
 *   npm run render:all -- --still --at 0.2     # …or at another point (0–1)
 *   npm run render:all -- --safe-zone          # burn in the safe-zone overlay (review only)
 *   npm run render:all -- --frames 0-89        # a range, for quick checks
 *
 * GPU-less machines: REMOTION_GL=swangle. Custom Chrome: REMOTION_BROWSER=/path.
 */
import { readdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = (name: string) => value(name)?.split(',').filter(Boolean);

const LANGS = list('lang') ?? ['en', 'zh', 'ms'];
const RATIOS = list('ratio') ?? ['9x16', '4x5', '16x9'];
const ONLY = list('only');
const frames = value('frames')?.split('-').map(Number) as [number, number] | undefined;
const still = flag('still');
const at = Number(value('at') ?? 0.45);
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
}

const jobs: Job[] = [
  { id: 'BrandPulse', name: 'brand-pulse-7s', props: { length: 7 } },
  { id: 'BrandPulse', name: 'brand-pulse-15s', props: { length: 15 } },
  ...jsonIds('cases').map((caseId) => ({ id: 'CaseOfWeek', name: `case-${caseId}`, props: { caseId } })),
  { id: 'BeforeYouSign', name: 'before-you-sign', props: {} },
  { id: 'FeeReveal', name: 'fee-reveal', props: {} },
  ...jsonIds('market').map((monthId) => ({ id: 'MarketPulse', name: `market-${monthId}`, props: { monthId } })),
  { id: 'LoungeMoment', name: 'lounge-moment', props: {} },
  { id: 'StoreReveal', name: 'store-reveal', props: {} },
  { id: 'MemberCardReveal', name: 'member-card', props: { memberNo: 'PJ-0001' } },
].filter((j) => !ONLY || ONLY.includes(j.id) || ONLY.includes(j.name));

console.log(`bundling… (${jobs.length} reels × ${LANGS.length} languages × ${RATIOS.length} formats)`);
const serveUrl = await bundle({ entryPoint: here('../src/index.ts'), publicDir: here('../../brand') });

let done = 0;
const total = jobs.length * LANGS.length * RATIOS.length;
for (const job of jobs) {
  for (const lang of LANGS) {
    for (const ratio of RATIOS) {
      const inputProps = { ...job.props, lang, ratio, showSafeZone: flag('safe-zone') };
      const composition = await selectComposition({
        serveUrl,
        id: job.id,
        inputProps,
        browserExecutable,
        chromiumOptions: { gl },
      });
      const base = here(`../out/${job.name}-${lang}-${ratio}`);
      const started = Date.now();
      if (still) {
        await renderStill({
          serveUrl,
          composition,
          inputProps,
          frame: Math.floor(composition.durationInFrames * at),
          output: `${base}${value('at') ? `-at${at}` : ''}.png`,
          browserExecutable,
          chromiumOptions: { gl },
        });
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
          frameRange: frames ?? null,
          outputLocation: `${base}.mp4`,
          concurrency,
          browserExecutable,
          chromiumOptions: { gl },
        });
      }
      done++;
      console.log(
        `[${done}/${total}] ${job.name}-${lang}-${ratio}${still ? '.png' : '.mp4'}  ${composition.width}×${composition.height}  ${(composition.durationInFrames / composition.fps).toFixed(1)}s  (${((Date.now() - started) / 1000).toFixed(0)}s)`,
      );
    }
  }
}
