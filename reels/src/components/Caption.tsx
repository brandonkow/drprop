/**
 * Three-language captions (brief §9.6): Instrument Serif / Noto Serif SC for
 * display lines, Geist / Noto Sans SC for body. Static text with a soft fade —
 * never word-by-word, no outlines, no stickers.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Lang } from '../copy';
import { FONTS } from '../fonts';
import { TEXT_MAX_9x16, TYPE, type Ratio } from '../layout';
import { fadeWindow } from './motion';

export interface CaptionProps {
  children: ReactNode;
  lang: Lang;
  ratio: Ratio;
  role?: 'display' | 'body' | 'small' | 'mono';
  from: number;
  to: number;
  color?: string;
  align?: CSSProperties['textAlign'];
  style?: CSSProperties;
}

export function Caption({ children, lang, ratio, role = 'body', from, to, color, align = 'left', style }: CaptionProps) {
  const frame = useCurrentFrame();
  const opacity = fadeWindow(frame, from, to);
  if (opacity === 0) return null;
  const size = role === 'display' ? TYPE[ratio].display : role === 'small' ? TYPE[ratio].small : TYPE[ratio].body;
  const zh = lang === 'zh';
  const family = role === 'display' ? FONTS.display : role === 'mono' ? FONTS.mono : FONTS.body;
  return (
    <div
      lang={zh ? 'zh-Hans' : lang}
      style={{
        opacity,
        color,
        fontFamily: family,
        fontWeight: role === 'display' && zh ? 300 : 400,
        fontSize: role === 'display' && zh ? size * 0.86 : size,
        lineHeight: role === 'display' ? (zh ? 1.22 : 1.05) : 1.45,
        letterSpacing: role === 'display' ? (zh ? '0.02em' : '-0.01em') : role === 'small' ? '0.04em' : 0,
        textAlign: align,
        textWrap: 'balance',
        maxWidth: ratio === '9x16' && align === 'left' ? TEXT_MAX_9x16 : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
