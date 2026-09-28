/**
 * App theme from the brand tokens (brief §8.5): colours, type, radii 0–2,
 * hairlines instead of shadows, dark mode on night / night-text.
 */
import { color, motion, scheme } from '@drprop/brand/tokens';
import { Platform, useColorScheme } from 'react-native';

export const FONT = {
  display: 'InstrumentSerif_400Regular',
  body: 'Geist_400Regular',
  mono: 'GeistMono_400Regular',
} as const;

/**
 * Chinese uses the system CJK faces rather than bundling ~20 MB of Noto:
 * Songti on iOS and the system serif (Noto Serif CJK) on Android for display;
 * PingFang / Noto Sans CJK for body, which the system picks up as fallback.
 */
export const CJK_DISPLAY = Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' });

export const SIZE = {
  /** One display size per screen (§5.3). */
  display: 44,
  body: 17,
  small: 13,
} as const;

export const SPACE = { 1: 8, 2: 16, 3: 24, 4: 32, 5: 40, 6: 48, 8: 64, 10: 80, 12: 96 } as const;

export const RADIUS = { none: 0, hair: 2 } as const;

export const HAIRLINE = 1;
export const TOUCH_MIN = 44;

export const EASE = motion.easeArray;
export const DURATION = { short: motion.durationShortMs, long: motion.durationLongMs };

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  rule: string;
  wash: string;
  accent: string;
  /** Text on the solid button. */
  onSolid: string;
}

const light: Palette = { ...scheme.light, onSolid: color.bone };
const dark: Palette = { ...scheme.dark, onSolid: color.night };

export function usePalette(): Palette & { dark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { ...(isDark ? dark : light), dark: isDark };
}

export { color };

/** Web only: drop the browser focus ring on text inputs; the hairline turns ink instead. */
export const INPUT_RESET = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });
