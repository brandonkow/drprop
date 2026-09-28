/**
 * Type roles (brief §5.3): one display size per screen, body and small for the
 * rest, mono for numbers. Chinese display text uses the system serif.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useApp } from '../state/app-state';
import { CJK_DISPLAY, FONT, SIZE, usePalette } from '../theme';

type Props = TextProps & { children: ReactNode; muted?: boolean; accent?: boolean };

function useColor(muted?: boolean, accent?: boolean) {
  const p = usePalette();
  return accent ? p.accent : muted ? p.muted : p.text;
}

export function Display({ style, muted, accent, ...rest }: Props) {
  const { language } = useApp();
  const color = useColor(muted, accent);
  return (
    <Text
      accessibilityRole="header"
      style={[s.display, language === 'zh' && s.displayZh, { color }, style]}
      {...rest}
    />
  );
}

export function Body({ style, muted, accent, ...rest }: Props) {
  return <Text style={[s.body, { color: useColor(muted, accent) }, style]} {...rest} />;
}

export function Small({ style, muted = true, accent, ...rest }: Props) {
  return <Text style={[s.small, { color: useColor(muted, accent) }, style]} {...rest} />;
}

/** Section label: small, tracked, uppercase for Latin. */
export function Label({ style, ...rest }: Props) {
  return <Small style={[s.label, style]} {...rest} />;
}

export function Mono({ style, muted, accent, ...rest }: Props) {
  return <Text style={[s.mono, { color: useColor(muted, accent) }, style]} {...rest} />;
}

const s = StyleSheet.create({
  display: {
    fontFamily: FONT.display,
    fontSize: SIZE.display,
    lineHeight: SIZE.display * 1.08,
    letterSpacing: -0.3,
  },
  displayZh: {
    fontFamily: CJK_DISPLAY,
    fontWeight: '300',
    fontSize: SIZE.display * 0.86,
    lineHeight: SIZE.display * 1.2,
    letterSpacing: 1,
  },
  body: { fontFamily: FONT.body, fontSize: SIZE.body, lineHeight: SIZE.body * 1.55 },
  small: { fontFamily: FONT.body, fontSize: SIZE.small, lineHeight: SIZE.small * 1.5 },
  label: { letterSpacing: 1.1, textTransform: 'uppercase' },
  mono: { fontFamily: FONT.mono, fontSize: SIZE.body, fontVariant: ['tabular-nums'] },
});
