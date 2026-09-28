/**
 * Brand fonts for the reels, bundled from the same Fontsource files as the site
 * (no network at render time). Captions wait for their faces before any frame
 * is captured.
 */
import '@drprop/brand/fonts.css';
import '@drprop/brand/fonts-cjk.css';
import { font } from '@drprop/brand/tokens';
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import type { Lang } from './copy';

export const FONTS = {
  display: font.display,
  body: font.body,
  mono: font.mono,
} as const;

/** Blocks rendering until the faces used by `text` have loaded. */
export function useFonts(lang: Lang, text: string) {
  const [handle] = useState(() => delayRender(`fonts-${lang}`));
  useEffect(() => {
    const sample = text || 'DR. PROP 0123';
    const faces = [
      `400 80px "Instrument Serif"`,
      `400 40px "Geist"`,
      `400 40px "Geist Mono"`,
      ...(lang === 'zh' ? [`300 80px "Noto Serif SC"`, `400 40px "Noto Sans SC"`] : []),
    ];
    Promise.all(faces.map((f) => document.fonts.load(f, sample)))
      .catch(() => {})
      .finally(() => continueRender(handle));
  }, [handle, lang, text]);
}
