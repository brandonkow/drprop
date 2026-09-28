import React from 'react';
import { tokens } from '../tokens';
const triangle = (x: number, centre: number, span: number) => Math.max(0, 1 - Math.abs(x - centre) / span);
export function pulsePoints(progress: number, phase = 0) {
  return Array.from({ length: 512 }, (_, i) => {
    const x = i / 511;
    const beat = triangle(x, .28, .035) * .22 - triangle(x, .4, .015) * .12 + triangle(x, .45, .024) * .72 - triangle(x, .49, .02) * .22;
    const roof = triangle(x, .5, .17) * .65;
    const skyline = triangle(x, .18, .08) * .32 + triangle(x, .39, .10) * .55 + (x > .54 && x < .65 ? .75 : 0) + triangle(x, .79, .10) * .4;
    const stops = [0, beat * (.85 + Math.sin(phase) * .15), roof, skyline];
    const scaled = Math.min(3, Math.max(0, progress * 3)); const index = Math.min(2, Math.floor(scaled));
    return [x * 800, 110 - (stops[index] + (stops[index+1] - stops[index]) * (scaled-index)) * 100];
  });
}
export function PulseLine({ progress, phase = 0, light = false }: { progress: number; phase?: number; light?: boolean }) {
  const points = pulsePoints(progress, phase);
  return <svg viewBox="0 0 800 140" width="100%" height="100%"><path d={points.map(([x,y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')} fill="none" stroke={light ? tokens['night-text'] : tokens.ink} strokeWidth={2} /></svg>;
}
