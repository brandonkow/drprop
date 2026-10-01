import { bundle } from '@remotion/bundler';
import { getCompositions, openBrowser, renderMedia, renderStill } from '@remotion/renderer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateCase, validateMarket } from '../src/validate.ts';
import { masterVideo } from '../../scripts/audio-master.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const option = (key: string) => args.find(arg=>arg.startsWith(`--${key}=`))?.slice(key.length+3);
const stills = args.includes('--stills'); const filter = option('only'); const ratio = option('ratio');
const stillFrame = Number(option('frame') ?? 90);
const concurrency = Number(process.env.RENDER_CONCURRENCY || 1);
if (!Number.isInteger(stillFrame) || stillFrame < 0) throw new Error('--frame must be a nonnegative integer.');
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('RENDER_CONCURRENCY must be an integer from 1 to 32.');
const casePath = path.resolve(root, option('case') ?? 'src/data/cases/sample.json');
const marketPath = path.resolve(root, option('market') ?? 'src/data/market/selangor-2025.json');
const inputProps = { language: 'en', showSafeZone: args.includes('--safe-zones'), forceModelFallback: args.includes('--fallback'), caseData: validateCase(JSON.parse(await readFile(casePath,'utf8'))), marketData: validateMarket(JSON.parse(await readFile(marketPath,'utf8'))), storeStatus: 'concept' };
const out = path.resolve(root, '../out'); await mkdir(out, {recursive:true});
const serveUrl = await bundle({ entryPoint: path.join(root,'src/index.ts'), publicDir: path.join(root,'public'), outDir: path.join(root,'.cache/bundle'), webpackOverride: config => ({...config, resolve: {...config.resolve, alias: {...config.resolve?.alias, three: path.resolve(path.dirname(require.resolve('three')), '..')}}}) });
// Remotion's supported Chrome Headless Shell is the default. Edge may exit before CDP connects.
const browserExecutable = process.env.CHROME_PATH || undefined;
const chromiumOptions = { gl: 'angle' as const };
const browser = await openBrowser('chrome', { browserExecutable, chromiumOptions });
const manifest: {createdAt:string; mode:string; language:string; inputs:unknown; outputs:unknown[]} = {createdAt:new Date().toISOString(), mode:stills?'stills':'video', language:'en', inputs: inputProps, outputs:[]};
try {
  const all = await getCompositions(serveUrl, {inputProps, puppeteerInstance:browser});
  const selected = all.filter(item=>(!filter || item.id.startsWith(filter+'-')) && (!ratio || item.id.endsWith(ratio)));
  if (!selected.length) throw new Error('No matching compositions. Check --only and --ratio.');
  for (const composition of selected) {
    const suffix = `${args.includes('--fallback') ? '-fallback' : ''}${args.includes('--safe-zones') ? '-safe-zones' : ''}${stills && option('frame') ? '-frame'+stillFrame : ''}`;
    const destination = path.join(out, `${composition.id}${suffix}.${stills?'png':'mp4'}`);
    console.log(`Rendering ${composition.id} (${manifest.outputs.length+1}/${selected.length})`);
    const common = {serveUrl, composition, inputProps, puppeteerInstance:browser, chromiumOptions, timeoutInMilliseconds:120_000};
    const frame = Math.min(composition.durationInFrames-1, option('frame') ? stillFrame : composition.id.startsWith('FeeReveal-') ? 45 : stillFrame);
    let lastMilestone = -1;
    if (stills) await renderStill({...common, frame, output:destination, imageFormat:'png'});
    else await renderMedia({...common, outputLocation:destination, codec:'h264', crf:22, pixelFormat:'yuv420p', colorSpace:'bt709', audioCodec:'aac', enforceAudioTrack:true, concurrency, imageFormat:'jpeg', jpegQuality:90, onProgress:({progress})=>{const milestone=Math.floor(progress*4)*25;if(milestone>lastMilestone){console.log(`${composition.id}: ${milestone}%`);lastMilestone=milestone;}}});
    const audioMaster = stills ? undefined : await masterVideo(destination, composition.durationInFrames/composition.fps, {silent:composition.id.startsWith('StoreLoop-')});
    const buffer = await readFile(destination);
    manifest.outputs.push({file:path.basename(destination), width:composition.width, height:composition.height, fps:composition.fps, durationInFrames:composition.durationInFrames, ...(stills?{frame}:{audioMaster}), bytes:buffer.length, sha256:createHash('sha256').update(buffer).digest('hex')});
    await writeFile(path.join(out,`manifest-${stills?'stills':'video'}${filter?'-'+filter:''}${ratio?'-'+ratio:''}${suffix}.json`),JSON.stringify(manifest,null,2)+'\n');
  }
} finally { await browser.close({silent:true}); }
