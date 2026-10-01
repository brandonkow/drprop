import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rename, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const audioVersion = 'pulse-roof-original-v1';
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command}: ${result.stderr}`);
  return result;
}

// Original deterministic synthesis: no recordings, samples, external music or voice.
// Two soft low pulses, a damped wood-like resonator and a sparse C/E/G/A tone bed.
export function synthesize(seconds) {
  assert.ok(Number.isFinite(seconds) && seconds >= 1 && seconds <= 120, 'Duration must be 1–120 seconds.');
  const rate = 48000, samples = Math.round(seconds * rate);
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(36 + samples * 2, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  const tone = (t, frequency, decay) => t < 0 ? 0 : (1 - Math.exp(-t * 90)) * Math.exp(-t / decay) *
    (Math.sin(2 * Math.PI * frequency * t) + .18 * Math.sin(2 * Math.PI * frequency * 2 * t));
  for (let i = 0; i < samples; i++) {
    const t = i / rate;
    let value = .11 * tone(t - .35, 62, .13) + .085 * tone(t - .67, 57, .15);
    value += .065 * tone(t - 1.08, 392, .09) + .025 * tone(t - 1.08, 853, .055);
    for (let beat = 0; beat * 3.2 < seconds; beat++) {
      const age = t - (.95 + beat * 3.2);
      value += .07 * tone(age, [261.6256, 329.6276, 391.9954, 440][beat % 4], 2.6);
      value += .026 * tone(age, 130.8128, 3.4);
    }
    const fade = Math.min(1, t / .08, (seconds - t) / 1.1);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * fade)) * 32767), 44 + i * 2);
  }
  return wav;
}

export function measureAudio(file) {
  const { stderr } = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af',
    'loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']);
  return parseLoudnessReport(stderr);
}

export function parseLoudnessReport(stderr) {
  const match = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  assert.ok(match, 'FFmpeg loudness report missing.');
  const data = JSON.parse(match[0]);
  const numeric = value => value === '-inf' ? -Infinity : value === 'inf' ? Infinity : Number(value);
  return { integratedLufs: numeric(data.input_i), truePeakDbtp: numeric(data.input_tp),
    rangeLu: numeric(data.input_lra), threshold: numeric(data.input_thresh), offset: numeric(data.target_offset) };
}

export function videoStreamHash(file) {
  return run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim();
}

export async function masterVideo(file, seconds, { silent = false } = {}) {
  if (silent) {
    const measured = measureAudio(file);
    assert.equal(measured.integratedLufs, -Infinity, 'Store loop must remain silent.');
    return { status: 'silent-store-loop', integratedLufs: null };
  }
  const cache = path.join(root, 'reels', '.cache', 'audio');
  await mkdir(cache, { recursive: true });
  const temporary = await mkdtemp(path.join(cache, 'master-'));
  const source = path.join(temporary, 'source.wav'), encoded = path.join(temporary, 'master.mp4');
  try {
    await writeFile(source, synthesize(seconds));
    const first = measureAudio(source), before = videoStreamHash(file);
    assert.ok(Number.isFinite(first.integratedLufs));
    const filter = `loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${first.integratedLufs}:measured_TP=${first.truePeakDbtp}:measured_LRA=${first.rangeLu}:measured_thresh=${first.threshold}:offset=${first.offset}:linear=true`;
    run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-i', source, '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(seconds), '-movflags', '+faststart', encoded]);
    const measured = measureAudio(encoded), after = videoStreamHash(encoded);
    assert.ok(Math.abs(measured.integratedLufs + 14) <= .5, `Loudness outside -14 ±0.5 LUFS: ${JSON.stringify(measured)}`);
    assert.ok(measured.truePeakDbtp <= -1, `True peak exceeds -1 dBTP: ${JSON.stringify(measured)}`);
    assert.equal(after, before, 'Mastering must preserve every encoded video packet.');
    await rename(encoded, file);
    return { status: 'original-synthesized-draft', version: audioVersion, ...measured,
      videoStreamSha256: after.replace('SHA256=', ''), videoUnchanged: true };
  } finally {
    for (const item of [source, encoded]) await unlink(item).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(temporary);
  }
}
