/**
 * Generates tokens/tokens.css from tokens/tokens.ts.
 * Run: npm run brand:build
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokens } from '../tokens/tokens.ts';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const block = (entries: [string, string | number][], indent = '  ') =>
  entries.map(([k, v]) => `${indent}--${k}: ${v};`).join('\n');

const raw: [string, string | number][] = [
  ...Object.entries(tokens.color).map(([k, v]) => [kebab(k), v] as [string, string]),
  ['font-display', tokens.font.display],
  ['font-body', tokens.font.body],
  ['font-mono', tokens.font.mono],
  ['weight-display-latin', tokens.fontWeight.displayLatin],
  ['weight-display-cjk', tokens.fontWeight.displayCjk],
  ['weight-body', tokens.fontWeight.body],
  ['text-display', tokens.fontSize.display],
  ['text-body', tokens.fontSize.body],
  ['text-small', tokens.fontSize.small],
  ['leading-display', tokens.lineHeight.display],
  ['leading-body', tokens.lineHeight.body],
  ['tracking-display', tokens.letterSpacing.display],
  ['tracking-wordmark', tokens.letterSpacing.wordmark],
  ['tracking-label', tokens.letterSpacing.label],
  ...Object.entries(tokens.space).map(([k, v]) => [`space-${k}`, v] as [string, string]),
  ['section-gap-desktop', tokens.sectionGap.desktop],
  ['section-gap-mobile', tokens.sectionGap.mobile],
  ['radius-none', tokens.radius.none],
  ['radius-hair', tokens.radius.hair],
  ['rule', tokens.rule.width],
  ['rule-pulse', tokens.rule.pulse],
  ['ease', tokens.motion.ease],
  ['duration-short', tokens.motion.durationShort],
  ['duration-long', tokens.motion.durationLong],
  ['max-width', tokens.layout.maxWidth],
  ['gutter-mobile', tokens.layout.gutterMobile],
  ['gutter-desktop', tokens.layout.gutterDesktop],
  ['touch-min', tokens.layout.touchMin],
];

const role = (s: Record<string, string>) =>
  Object.entries(s).map(([k, v]) => [`c-${k}`, v] as [string, string]);

const css = `/* Generated from tokens.ts by scripts/build-css.ts — do not edit by hand. */

:root {
${block(raw)}

  /* Semantic roles — light (default) */
${block(role(tokens.scheme.light))}
}

/* Dark scheme. Opt-in: add data-scheme="dark" (the app follows the OS setting). */
[data-scheme='dark'] {
${block(role(tokens.scheme.dark))}
}
`;

const out = fileURLToPath(new URL('../tokens/tokens.css', import.meta.url));
writeFileSync(out, css);
console.log('wrote', out);
