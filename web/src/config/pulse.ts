import type { RoofOptions } from '@drprop/brand/pulse';
import type { SkylineVariant } from '@drprop/brand/pulse/forms';

/**
 * Hero Pulse Roof layout, shared by the static SVG (fallback) and the WebGL line
 * so the two draw the same shape in the same place.
 */
export interface PulseLayout {
  variant: SkylineVariant;
  /** SVG viewBox size; the SVG is stretched to the hero width. */
  viewBox: readonly [width: number, height: number];
  /** Apex height and baseline in viewBox units (y down). */
  height: number;
  baseline: number;
  roof: Required<Pick<RoofOptions, 'apex' | 'halfSpan' | 'dip'>>;
}

/** Below this width the narrow layout is used (matches the CSS breakpoint). */
export const PULSE_BREAKPOINT = 900;

export const PULSE_LAYOUT: Record<SkylineVariant, PulseLayout> = {
  wide: {
    variant: 'wide',
    viewBox: [1440, 160],
    height: 120,
    baseline: 140,
    roof: { apex: 0.7, halfSpan: 0.075, dip: 0.14 },
  },
  narrow: {
    variant: 'narrow',
    viewBox: [390, 120],
    height: 84,
    baseline: 100,
    roof: { apex: 0.68, halfSpan: 0.19, dip: 0.14 },
  },
};
