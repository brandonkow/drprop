/**
 * A placeholder sound logo (brief §9.6): one soft heartbeat as the Pulse line beats,
 * then a single felt-piano D as it folds into the roof. Timed to the end card
 * (components/ReelFrame.tsx, 75 frames at 30 fps), which plays it in every reel.
 *
 *     npx tsx scripts/sound-logo.ts   → brand/audio/sound-logo.wav (48 kHz, 16-bit stereo, 2.5 s)
 *
 * The brief asks for a commissioned sound logo with full rights. Replace this file
 * with that one, keeping the name and length. render-all brings each reel to −14 LUFS.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const FPS = 30;
const LENGTH = 75 / FPS;
const N = Math.round(LENGTH * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

const add = (i: number, v: number, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i]! += v * Math.cos(((pan + 1) * Math.PI) / 4);
  R[i]! += v * Math.sin(((pan + 1) * Math.PI) / 4);
};

/** Lub-dub, felt more than heard: a falling low sine with a quick decay. */
function beat(t0: number, amp: number) {
  for (const [dt, g] of [[0, 1], [0.24, 0.62]] as const) {
    const i0 = Math.floor((t0 + dt) * SR);
    for (let k = 0; k < 0.4 * SR; k++) {
      const t = k / SR;
      const f = 62 - 18 * Math.min(1, t / 0.12);
      add(i0 + k, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * Math.min(1, t / 0.004) * amp * g);
    }
  }
}

/** Seeded noise, so the file is the same on every run. */
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

/** A felt piano note: soft attack, a little hammer, partials that fade at different rates. */
function piano(freq: number, t0: number, amp: number, pan = 0) {
  const i0 = Math.floor(t0 * SR);
  for (let k = 0; i0 + k < N; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 1.6);
    const s =
      Math.sin(2 * Math.PI * freq * t) +
      0.35 * Math.sin(2 * Math.PI * freq * 2.001 * t) * Math.exp(-t * 2.5) +
      0.12 * Math.sin(2 * Math.PI * freq * 3.004 * t) * Math.exp(-t * 4) +
      0.05 * Math.sin(2 * Math.PI * freq * 4.01 * t) * Math.exp(-t * 6);
    const hammer = k < 0.02 * SR ? noise() * 0.04 * (1 - k / (0.02 * SR)) : 0;
    add(i0 + k, (s * env + hammer) * amp, pan);
  }
}

// Frame 18: the line beats. Frame 46: it has folded into the roof.
beat(18 / FPS, 0.7);
piano(587.33, 46 / FPS, 0.32, 0); // D5
piano(293.66, 46 / FPS + 0.01, 0.12, -0.2); // D4 under it, quietly

// A small room (Schroeder: four combs, two all-passes), mixed low.
function room(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length);
  for (const [ms, g] of [[29.7, 0.78], [37.1, 0.77], [41.1, 0.76], [43.7, 0.75]] as const) {
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
  L[i] = L[i]! * 0.82 + wetL[i]! * 0.2;
  R[i] = R[i]! * 0.82 + wetR[i]! * 0.2;
  peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
}

// Peak at −3 dBFS; a short fade at the end so the card cuts cleanly.
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
  const fade = Math.min(1, (N - i) / (0.25 * SR));
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i]! * gain * fade)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i]! * gain * fade)) * 32767), 46 + i * 4);
}
const out = fileURLToPath(new URL('../../brand/audio/sound-logo.wav', import.meta.url));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pcm);
console.log(`sound logo → ${out} (${LENGTH.toFixed(2)} s)`);
