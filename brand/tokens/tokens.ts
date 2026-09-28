/**
 * Dr Prop design tokens — single source of truth (brief §5).
 * `tokens.css` is generated from this file: `npm run brand:build`.
 * Web, app (Expo) and reels (Remotion) all read from here.
 */

export const color = {
  /** Main background — bone white */
  bone: '#F4F1EA',
  /** Secondary background */
  paper: '#FBFAF7',
  /** Primary text — ink, never pure black */
  ink: '#1C1B19',
  /** Secondary text, hairlines */
  stone: '#8A857C',
  /** Large supporting surfaces, section dividers */
  travertine: '#D9CFBF',
  /** The only accent. Max three uses per page. */
  bronze: '#8C6A43',
  /** Dark mode background */
  night: '#141412',
  /** Dark mode text */
  nightText: '#EDE9E1',
} as const;

/** Semantic roles for light and dark schemes. */
export const scheme = {
  light: {
    bg: color.bone,
    surface: color.paper,
    text: color.ink,
    muted: color.stone,
    rule: color.stone,
    wash: color.travertine,
    accent: color.bronze,
  },
  dark: {
    bg: color.night,
    surface: '#1C1B19',
    text: color.nightText,
    muted: color.stone,
    rule: '#4A4741',
    wash: '#2A2825',
    accent: '#B08B60',
  },
} as const;

export const font = {
  display: "'Instrument Serif', 'Noto Serif SC', 'Songti SC', serif",
  body: "'Geist', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
} as const;

export const fontWeight = {
  displayLatin: 400,
  displayCjk: 300,
  body: 400,
  mono: 400,
} as const;

/**
 * Type scale. Rule (§5.3): per screen at most one display size + two body sizes.
 * Contrast comes from size, not colour.
 */
export const fontSize = {
  display: 'clamp(48px, 9vw, 120px)',
  body: 'clamp(15px, 0.35vw + 14px, 17px)',
  small: '13px',
} as const;

export const lineHeight = {
  display: 1.02,
  body: 1.6,
} as const;

export const letterSpacing = {
  display: '-0.01em',
  wordmark: '0.18em',
  label: '0.08em',
} as const;

/** 8pt grid. */
export const space = {
  1: '8px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '40px',
  6: '48px',
  8: '64px',
  10: '80px',
  12: '96px',
  16: '128px',
  20: '160px',
} as const;

/** Section rhythm (§5.4): ≥160px desktop, ≥96px mobile. */
export const sectionGap = {
  desktop: space[20],
  mobile: space[12],
} as const;

export const radius = {
  none: '0',
  hair: '2px',
} as const;

export const rule = {
  width: '1px',
  pulse: '1.5px',
} as const;

export const motion = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeArray: [0.22, 1, 0.36, 1] as const,
  durationShort: '600ms',
  durationLong: '1200ms',
  durationShortMs: 600,
  durationLongMs: 1200,
} as const;

export const layout = {
  maxWidth: '1440px',
  gutterMobile: '20px',
  gutterDesktop: '48px',
  touchMin: '44px',
} as const;

export const tokens = {
  color,
  scheme,
  font,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  space,
  sectionGap,
  radius,
  rule,
  motion,
  layout,
} as const;

export type Tokens = typeof tokens;
