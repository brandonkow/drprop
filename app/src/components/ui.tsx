/**
 * Buttons and structure (brief §5.4): text + underline, or a 1px outlined
 * rectangle. The one solid button per screen is the primary action.
 * Radii 0, hairlines instead of shadows, touch targets ≥ 44pt.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONT, HAIRLINE, RADIUS, SIZE, SPACE, TOUCH_MIN, usePalette } from '../theme';

interface ButtonProps {
  label: string;
  onPress(): void;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

/** The only solid button on a screen. */
export function SolidButton({ label, onPress, disabled, busy, style, accessibilityHint }: ButtonProps) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      accessibilityHint={accessibilityHint}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.solid,
        { backgroundColor: p.text, opacity: disabled ? 0.35 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={p.onSolid} /> : null}
      <Text style={[s.solidText, { color: p.onSolid }]}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({ label, onPress, disabled, busy, style }: ButtonProps) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [s.outline, { borderColor: p.text, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }, style]}
    >
      <Text style={[s.outlineText, { color: p.text }]}>{label}</Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress, style, muted, tint, disabled }: ButtonProps & { muted?: boolean; tint?: string }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[s.link, style]}
    >
      {({ pressed }) => (
        <Text
          style={[
            s.linkText,
            {
              color: tint ?? (muted ? p.muted : p.text),
              textDecorationColor: tint ?? p.muted,
              opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Rule({ style }: { style?: ViewStyle }) {
  const p = usePalette();
  return <View style={[{ height: HAIRLINE, backgroundColor: p.rule }, style]} />;
}

/** A tappable row between hairlines: big text, no card. */
export function Row({
  children,
  onPress,
  selected,
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?(): void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [s.row, { borderColor: p.rule, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      {selected ? <View style={[s.marker, { backgroundColor: p.accent }]} /> : null}
      {children}
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const p = usePalette();
  const body = <View style={s.inner}>{children}</View>;
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: p.bg }]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: { flex: 1, paddingHorizontal: SPACE[3], paddingVertical: SPACE[3], gap: SPACE[3] },
  solid: {
    minHeight: 52,
    borderRadius: RADIUS.none,
    paddingHorizontal: SPACE[3],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE[1],
  },
  solidText: { fontFamily: FONT.body, fontSize: SIZE.body, letterSpacing: 0.4 },
  outline: {
    minHeight: TOUCH_MIN + 4,
    borderWidth: HAIRLINE,
    borderRadius: RADIUS.none,
    paddingHorizontal: SPACE[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontFamily: FONT.body, fontSize: SIZE.body - 2, letterSpacing: 0.3 },
  link: { minHeight: TOUCH_MIN, minWidth: TOUCH_MIN, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: FONT.body, fontSize: SIZE.body - 2, textDecorationLine: 'underline' },
  row: {
    minHeight: TOUCH_MIN + 20,
    paddingVertical: SPACE[2],
    borderTopWidth: HAIRLINE,
    justifyContent: 'center',
  },
  marker: { position: 'absolute', left: -SPACE[2], top: '50%', width: 10, height: 1.5 },
});
