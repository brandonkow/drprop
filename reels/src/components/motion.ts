/**
 * Motion rules for reels (brief §5.5, §9.6): brand easing, fades and slow camera
 * moves only. No bounce, no whip pans, no flashes, no per-word pops.
 */
import { motion } from '@drprop/brand/tokens';
import { Easing, interpolate } from 'remotion';

export const ease = Easing.bezier(...motion.easeArray);

/** 0 → 1 over [start, end] frames with brand easing, clamped. */
export const progress = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

/** Opacity for an element shown from `from` to `to`, with soft fades at both ends. */
export function fadeWindow(frame: number, from: number, to: number, fade = 15): number {
  if (frame < from || frame > to) return 0;
  const inT = progress(frame, from, from + fade);
  const outT = 1 - progress(frame, to - fade, to);
  return Math.min(inT, outT);
}
