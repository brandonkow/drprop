/**
 * The delivery pass for finished videos (render-all runs it after every MP4).
 *
 * Colour: BT.709, limited range, and tagged as such. Remotion's default path writes
 * full-range BT.601 (yuvj420p), and a later ffmpeg pass can drop the tags. Phones
 * and platforms then guess, and greens, skin and bronze shift. Untagged input is
 * read as BT.601, which is what ffmpeg's scaler used to make it.
 *
 * Sound: −14 LUFS integrated, true peak at or below −1 dBTP (two-pass loudnorm),
 * the level Instagram, TikTok and YouTube play at. A silent track stays silent.
 *
 *     npx tsx scripts/deliver.ts <file.mp4>...           convert in place
 *     npx tsx scripts/deliver.ts --tag-only <file.mp4>   tag the colour, no re-encode
 *     npx tsx scripts/deliver.ts --check <file.mp4>...   report; exit 1 if any fails
 *
 * Uses ffmpeg/ffprobe from FFMPEG/FFPROBE, else the copy bundled with Remotion.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET = { lufs: -14, truePeak: -1, tolerance: 1 };

function tools(): { ffmpeg: string; ffprobe: string; env: NodeJS.ProcessEnv } {
  if (process.env.FFMPEG && process.env.FFPROBE) return { ffmpeg: process.env.FFMPEG, ffprobe: process.env.FFPROBE, env: process.env };
  const require = createRequire(import.meta.url);
  const libc = process.platform === 'linux' ? '-gnu' : '';
  for (const pkg of [`@remotion/compositor-${process.platform}-${process.arch === 'x64' ? 'x64' : process.arch}${libc}`]) {
    try {
      const dir = dirname(require.resolve(`${pkg}/package.json`));
      const exe = process.platform === 'win32' ? '.exe' : '';
      if (existsSync(join(dir, `ffmpeg${exe}`))) {
        // The bundled binaries load their libraries from their own folder.
        const env = { ...process.env, LD_LIBRARY_PATH: [dir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') };
        return { ffmpeg: join(dir, `ffmpeg${exe}`), ffprobe: join(dir, `ffprobe${exe}`), env };
      }
    } catch {
      // not installed for this platform
    }
  }
  return { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', env: process.env };
}

const { ffmpeg, ffprobe, env } = tools();

/** Runs a tool and returns stdout, or throws with the end of stderr. */
function run(bin: string, args: string[]): { stdout: string; stderr: string } {
  const r = spawnSync(bin, args, { env, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`${bin} failed: ${(r.stderr || String(r.error)).slice(-2000)}`);
  return { stdout: r.stdout, stderr: r.stderr };
}

interface Probe {
  video: { codec: string; pixFmt: string; range: string; space: string; primaries: string; transfer: string; fps: string } | null;
  audio: { codec: string } | null;
}

export function probe(file: string): Probe {
  const json = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', file]).stdout) as {
    streams: Record<string, string>[];
  };
  const v = json.streams.find((s) => s.codec_type === 'video');
  const a = json.streams.find((s) => s.codec_type === 'audio');
  return {
    video: v
      ? {
          codec: v.codec_name ?? '',
          pixFmt: v.pix_fmt ?? '',
          range: v.color_range ?? 'unknown',
          space: v.color_space ?? 'unknown',
          primaries: v.color_primaries ?? 'unknown',
          transfer: v.color_transfer ?? 'unknown',
          fps: v.r_frame_rate ?? '',
        }
      : null,
    audio: a ? { codec: a.codec_name ?? '' } : null,
  };
}

/** Integrated loudness and true peak; null for a silent track. */
export function loudness(file: string): { lufs: number; truePeak: number; lra: number; thresh: number; offset: number } | null {
  const err = run(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=11:print_format=json`, '-f', 'null', '-']).stderr;
  const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1)) as Record<string, string>;
  const lufs = Number(m.input_i);
  // ffmpeg reports silence as -inf (Number() gives -Infinity); anything below -70 is silence too.
  if (!Number.isFinite(lufs) || lufs < -70) return null;
  return { lufs, truePeak: Number(m.input_tp), lra: Number(m.input_lra), thresh: Number(m.input_thresh), offset: Number(m.target_offset) };
}

const isBt709 = (v: NonNullable<Probe['video']>) =>
  v.pixFmt === 'yuv420p' && v.range === 'tv' && v.space === 'bt709' && v.primaries === 'bt709' && v.transfer === 'bt709';

/** Problems with a delivered file; empty when it passes. */
export function check(file: string): string[] {
  const p = probe(file);
  const out: string[] = [];
  if (!p.video) return ['no video stream'];
  if (p.video.codec !== 'h264') out.push(`video is ${p.video.codec}, not H.264`);
  if (!isBt709(p.video)) out.push(`colour is ${p.video.pixFmt}/${p.video.range}/${p.video.space}, not yuv420p/tv/bt709`);
  if (p.audio) {
    if (p.audio.codec !== 'aac') out.push(`audio is ${p.audio.codec}, not AAC`);
    const l = loudness(file);
    if (l && Math.abs(l.lufs - TARGET.lufs) > TARGET.tolerance) out.push(`loudness ${l.lufs.toFixed(1)} LUFS, not ${TARGET.lufs} ±${TARGET.tolerance}`);
    if (l && l.truePeak > TARGET.truePeak + 0.2) out.push(`true peak ${l.truePeak.toFixed(1)} dBTP, above ${TARGET.truePeak}`);
  }
  return out;
}

const COLOUR_TAGS = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];

/** Converts a file in place. Already-correct streams are copied, so running it twice changes nothing. */
export function deliver(file: string, opts: { tagOnly?: boolean } = {}): string {
  const p = probe(file);
  if (!p.video) throw new Error(`${file}: no video stream`);
  const tmp = file.replace(/\.mp4$/, '.delivering.mp4');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-map', '0:v:0'];
  const notes: string[] = [];

  if (isBt709(p.video)) {
    args.push('-c:v', 'copy');
  } else if (opts.tagOnly) {
    // Label what is there (ffmpeg's scaler default: BT.601, limited range); no re-encode.
    const full = p.video.pixFmt === 'yuvj420p' || p.video.range === 'pc';
    args.push('-c:v', 'copy', '-bsf:v', `h264_metadata=colour_primaries=6:transfer_characteristics=6:matrix_coefficients=6:video_full_range_flag=${full ? 1 : 0}`);
    notes.push('colour tagged BT.601');
  } else {
    const inMatrix = p.video.space === 'bt709' ? 'bt709' : 'bt601';
    const inRange = p.video.pixFmt === 'yuvj420p' || p.video.range === 'pc' ? 'full' : 'tv';
    args.push(
      // x264-params writes the colour description into the stream itself: ffmpeg 7 takes it
      // from the frames rather than from the output options alone (and Remotion's
      // minimal ffmpeg has no setparams filter).
      '-vf', `scale=in_color_matrix=${inMatrix}:out_color_matrix=bt709:in_range=${inRange}:out_range=tv,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv', ...COLOUR_TAGS,
    );
    notes.push(`colour ${p.video.pixFmt}/${inRange}/${inMatrix} → yuv420p/tv/bt709`);
  }

  if (p.audio) {
    args.push('-map', '0:a:0');
    const l = loudness(file);
    if (!l) {
      args.push('-c:a', 'copy');
      notes.push('audio silent, kept');
    } else if (Math.abs(l.lufs - TARGET.lufs) <= 0.5 && l.truePeak <= TARGET.truePeak && p.audio.codec === 'aac') {
      args.push('-c:a', 'copy');
      notes.push(`audio ${l.lufs.toFixed(1)} LUFS, kept`);
    } else {
      const ln = `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak - 0.5}:LRA=11:measured_I=${l.lufs}:measured_TP=${l.truePeak}:measured_LRA=${l.lra}:measured_thresh=${l.thresh}:offset=${l.offset}:linear=true`;
      args.push('-af', `${ln},aresample=48000`, '-c:a', 'aac', '-b:a', '192k');
      notes.push(`audio ${l.lufs.toFixed(1)} LUFS → ${TARGET.lufs}`);
    }
  }

  args.push('-movflags', '+faststart', tmp);
  try {
    run(ffmpeg, args);
    renameSync(tmp, file);
  } finally {
    rmSync(tmp, { force: true });
  }
  return notes.join('; ');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const files = argv.filter((a) => !a.startsWith('--'));
  if (argv.includes('--check')) {
    let failed = 0;
    for (const f of files) {
      const problems = check(f);
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${f}${problems.length ? `: ${problems.join('; ')}` : ''}`);
      failed += problems.length ? 1 : 0;
    }
    process.exitCode = failed ? 1 : 0;
  } else {
    for (const f of files) console.log(`${f}: ${deliver(f, { tagOnly: argv.includes('--tag-only') }) || 'already delivered'}`);
  }
}
