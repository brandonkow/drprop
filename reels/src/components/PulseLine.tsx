/**
 * 2D Pulse Roof line (SVG), frame-driven: flat → beat → roof → skyline with the
 * same blending as the website shader (brand pulseAt).
 */
import { pulseAt, pulseGeometry, type SkylineVariant } from '@drprop/brand/pulse/forms';
import { useMemo } from 'react';

export interface PulseLineProps {
  width: number;
  /** Apex height in px. */
  height: number;
  /** Baseline y within the SVG, px. */
  baseline: number;
  /** 0 flat · 0.25 beat · 0.5 roof · 1 skyline. */
  progress: number;
  /** Seconds, drives the heartbeat. */
  time: number;
  color: string;
  strokeWidth?: number;
  /** 0–1: how much of the line is drawn, left to right. */
  draw?: number;
  apex?: number;
  variant?: SkylineVariant;
  svgHeight?: number;
}

export function PulseLine({
  width,
  height,
  baseline,
  progress,
  time,
  color,
  strokeWidth = 3,
  draw = 1,
  apex = 0.62,
  variant = 'wide',
  svgHeight,
}: PulseLineProps) {
  const geo = useMemo(() => pulseGeometry(384, { apex, halfSpan: 0.12, dip: 0.14 }, variant), [apex, variant]);
  const pts = pulseAt(geo, progress, time, width);
  let d = '';
  for (let i = 0; i < geo.count; i++) {
    const x = pts[i * 2]! * width;
    const y = baseline - pts[i * 2 + 1]! * height;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return (
    <svg width={width} height={svgHeight ?? baseline + height * 0.4} style={{ overflow: 'visible', display: 'block' }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeMiterlimit={10}
        pathLength={1}
        strokeDasharray={draw < 1 ? `${draw} 1` : undefined}
      />
    </svg>
  );
}
