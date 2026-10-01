import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLoudnessReport, synthesize } from '../scripts/audio-master.mjs';

test('original sound is deterministic, correctly timed, non-silent and fades to zero', () => {
  const wave = synthesize(7);
  assert.deepEqual(wave, synthesize(7));
  assert.equal(wave.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wave.readUInt32LE(24), 48000);
  assert.equal(wave.length, 44 + 7 * 48000 * 2);
  let peak = 0;
  for (let offset = 44; offset < wave.length; offset += 2) peak = Math.max(peak, Math.abs(wave.readInt16LE(offset)));
  assert.ok(peak > 1000 && peak < 32767);
  assert.equal(wave.readInt16LE(44), 0);
  assert.ok(Math.abs(wave.readInt16LE(wave.length - 2)) <= 1);
});

test('sound synthesis rejects invalid and unbounded durations', () => {
  for (const seconds of [0, -1, NaN, Infinity, 121]) assert.throws(() => synthesize(seconds));
});

test('FFmpeg silence is distinguished from invalid or missing loudness evidence', () => {
  const silent = parseLoudnessReport('[Parsed_loudnorm] measured output:\n' + JSON.stringify({
    input_i: '-inf', input_tp: '-inf', input_lra: '0.00', input_thresh: '-70.00', target_offset: 'inf',
  }));
  assert.equal(silent.integratedLufs, -Infinity);
  assert.equal(silent.truePeakDbtp, -Infinity);
  assert.equal(silent.offset, Infinity);
  assert.throws(() => parseLoudnessReport('Decoder failed before measurement.'));
});
