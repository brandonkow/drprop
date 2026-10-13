import { describe, expect, it } from 'vitest';
import { checkMetadata, type Probe } from '../scripts/deliver';
const good: Probe = { video: { codec: 'h264', pixFmt: 'yuv420p', range: 'tv', space: 'bt709', primaries: 'bt709', transfer: 'bt709', fps: '30/1', width: 1920, height: 1080, duration: 7, frames: 210 }, audio: { codec: 'aac' } };
describe('media delivery contract', () => {
  it('accepts the delivery formats', () => expect(checkMetadata(good)).toEqual([]));
  it('rejects the reviewed negative control even with correct colour tags', () => {
    const errors = checkMetadata({ video: { ...good.video!, width: 320, height: 180, fps: '5/1', duration: 0.4, frames: 2 }, audio: null });
    expect(errors).toEqual(expect.arrayContaining(['incorrect frame rate', 'incorrect dimensions', 'incorrect duration', 'missing required audio stream']));
  });
  it('rejects a shortened or swapped release asset', () => {
    expect(checkMetadata(good, { width: 1080, height: 1920, fps: 30, duration: 15, frames: 450 })).toEqual(expect.arrayContaining(['incorrect dimensions', 'incorrect duration', 'incorrect frame count']));
  });
});
