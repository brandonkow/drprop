/**
 * A placeholder score for the product film, synthesised so the film is never silent
 * while licensed music is chosen: a warm pad in D, a soft heartbeat where the Pulse
 * line beats, plucks on the cuts, a quiet arpeggio under the store scenes, and a
 * resolve on the end card. No whooshes, no risers (brief §9.6).
 *
 *     npx tsx scripts/score.ts      → brand/audio/promo-score.wav (48 kHz, 16-bit stereo)
 *     ffmpeg -i ../brand/audio/promo-score.wav -c:a aac -b:a 192k ../brand/audio/promo-score.m4a
 *
 * The film plays promo-score.m4a (or the .wav if that is all there is). Replace it with
 * licensed music of the same length (~68 s) to use that instead.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const FPS = 30;
const LENGTH = 2114 / FPS + 0.6; // the film plus a breath
const N = Math.ceil(LENGTH * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

/** Scene starts in seconds, matching reels/src/compositions/ProductFilm.tsx. */
const DURS = { open: 112, open2: 64, name: 84, model: 390, bronze: 90, materials: 90, drawer: 92, zero: 104, fee: 106, welcome: 112, lounge: 112, consult: 118, phone: 140, card: 150, golden: 112, street: 148 };
const at: Record<string, number> = {};
let f = 0;
for (const [k, d] of Object.entries(DURS)) {
  at[k] = f / FPS;
  f += d;
}
at.end = f / FPS;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const D2 = 38, A2 = 45, B2 = 47, D3 = 50, E3 = 52, Fs3 = 54, G3 = 55, A3 = 57, B3 = 59, D4 = 62, E4 = 64, Fs4 = 66, G4 = 67, A4 = 69, B4 = 71, Cs5 = 73, D5 = 74, E5 = 76, Fs5 = 78, A5 = 81;

function add(i: number, v: number, pan: number) {
  if (i < 0 || i >= N) return;
  L[i]! += v * Math.cos(((pan + 1) * Math.PI) / 4);
  R[i]! += v * Math.sin(((pan + 1) * Math.PI) / 4);
}

/** A sustained voice with slow attack and release, two slightly detuned partials. */
function pad(midi: number, t0: number, t1: number, amp: number, pan = 0) {
  const a = 2.2;
  const r = 2.8;
  const freq = hz(midi);
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.floor((t1 + r) * SR);
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / a) * (t > t1 ? Math.max(0, 1 - (t - t1) / r) : 1);
    if (env <= 0) continue;
    const vib = 1 + 0.0015 * Math.sin(2 * Math.PI * 4.6 * t);
    let s = 0;
    for (const [mult, g, det] of [[1, 1, 1.0015], [2, 0.32, 0.998], [3, 0.1, 1.001]] as const) {
      s += g * (Math.sin(2 * Math.PI * freq * mult * t * vib) + Math.sin(2 * Math.PI * freq * mult * det * t)) * 0.5;
    }
    add(i, s * env * env * amp, pan);
  }
}

/** A soft plucked note (felt piano / bell): quick attack, exponential decay. */
function pluck(midi: number, t0: number, amp: number, pan = 0, decay = 2.6) {
  const freq = hz(midi);
  const i0 = Math.floor(t0 * SR);
  const len = Math.floor(4.5 * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * decay);
    const s = Math.sin(2 * Math.PI * freq * t) + 0.28 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 3) + 0.08 * Math.sin(2 * Math.PI * freq * 3.01 * t) * Math.exp(-t * 5);
    add(i0 + k, s * env * amp, pan);
  }
}

/** The heartbeat: a low "lub-dub", felt more than heard. */
function beat(t0: number, amp: number) {
  for (const [dt, g] of [[0, 1], [0.24, 0.62]] as const) {
    const i0 = Math.floor((t0 + dt) * SR);
    for (let k = 0; k < 0.4 * SR; k++) {
      const t = k / SR;
      const fq = 62 - 18 * Math.min(1, t / 0.12);
      const s = Math.sin(2 * Math.PI * fq * t) * Math.exp(-t * 14) * Math.min(1, t / 0.004);
      add(i0 + k, s * amp * g, 0);
    }
  }
}

const chord = (notes: number[], t0: number, t1: number, amp: number) => notes.forEach((n, i) => pad(n, t0, t1, amp / Math.sqrt(notes.length), (i / (notes.length - 1)) * 1.2 - 0.6));

// Opening: a low drone, then the heartbeat as the Pulse line beats.
chord([D2, A2, D3], 0.2, at.model! + 1, 0.22);
beat(1.75, 0.55);
beat(2.85, 0.5);
// The name: one note.
pluck(D5, at.name! + 0.2, 0.12, 0);
// The model: the pad opens.
chord([D3, A3, Fs4, Cs5, E5], at.model! - 0.4, at.zero! - 0.5, 0.2);
pluck(A4, at.model! + 3.6, 0.16, -0.3);
pluck(Fs5, at.model! + 7.5, 0.1, 0.4);
// Macros: one note on each cut.
pluck(A5, at.bronze!, 0.12, 0.3);
pluck(Fs5, at.materials!, 0.12, -0.3);
pluck(E5, at.drawer!, 0.12, 0.2);
// The numbers: B minor, a heartbeat on "0%", notes climbing with the fee.
chord([B2, Fs3, A3, D4, E4], at.zero! - 0.3, at.welcome! - 0.2, 0.19);
beat(at.zero! + 0.25, 0.45);
for (let k = 0; k < 7; k++) pluck([B3, D4, E4, Fs4, A4, B4, D5][k]!, at.fee! + 0.35 + k * 0.19, 0.07, -0.4 + k * 0.12, 4);
// The place: G – Em – G – A, with an unhurried arpeggio.
const spans: [number[], number, number][] = [
  [[G3, D4, B4, Fs4], at.welcome!, at.lounge!],
  [[E3, B3, D4, G4, Fs4], at.lounge!, at.consult!],
  [[G3, D4, B4, Fs4], at.consult!, at.phone!],
  [[A2, E3, A3, D4], at.phone!, at.card!],
  [[G3, B3, D4, Fs4], at.card!, at.golden!],
  [[E3, B3, D4, G4], at.golden!, at.street!],
];
for (const [notes, t0, t1] of spans) {
  chord(notes, t0 - 0.3, t1 + 0.2, 0.17);
  const step = 60 / 72 / 2;
  let k = 0;
  for (let t = t0 + 0.2; t < t1 - 0.2; t += step, k++) pluck(notes[k % notes.length]! + 12, t, 0.035, k % 2 ? 0.35 : -0.35, 3.4);
}
// The street and the sign-off: back home to D, the heartbeat once more.
chord([D3, A3, Fs4, A4, Cs5, E5], at.street! - 0.3, at.end! + 1.2, 0.21);
beat(at.street! + 1.6, 0.4);
pluck(D5, at.street! + 1.4, 0.12, 0);
pluck(A4, at.end!, 0.12, -0.2);
pluck(D5, at.end! + 0.5, 0.1, 0.2);
chord([D2, A2, D3, E4, Fs4, A4], at.end! - 0.2, LENGTH - 2.4, 0.2);

// A little room: four combs and two all-passes (Schroeder), mixed in low.
function room(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length);
  for (const [ms, g] of [[29.7, 0.8], [37.1, 0.79], [41.1, 0.78], [43.7, 0.77]] as const) {
    const d = Math.floor((ms / 1000) * SR);
    const buf = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      buf[i] = x[i]! + (i >= d ? buf[i - d]! * g : 0);
      out[i]! += buf[i]! * 0.25;
    }
  }
  for (const ms of [5, 1.7]) {
    const d = Math.floor((ms / 1000) * SR);
    const y = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) y[i] = -0.7 * out[i]! + (i >= d ? out[i - d]! + 0.7 * y[i - d]! : 0);
    out.set(y);
  }
  return out;
}
const wetL = room(L);
const wetR = room(R);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = L[i]! * 0.8 + wetL[i]! * 0.22;
  R[i] = R[i]! * 0.8 + wetR[i]! * 0.22;
  peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
}
// Peak at −3 dBFS; short fades at both ends.
const gain = 0.708 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (0.05 * SR), (N - i) / (1.5 * SR));
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i]! * gain * fade)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i]! * gain * fade)) * 32767), 46 + i * 4);
}
const out = fileURLToPath(new URL('../../brand/audio/promo-score.wav', import.meta.url));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pcm);
console.log(`score → ${out} (${LENGTH.toFixed(1)} s)`);
