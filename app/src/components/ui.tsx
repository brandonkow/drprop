import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme, type TextInputProps, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../../../brand/tokens';
import { useDemo } from '../state/demo';
export const ThemeOverride = createContext<'dark' | 'light' | null>(null);
export function useTheme() {
  const { state } = useDemo(); const system = useColorScheme();
  const preference = useContext(ThemeOverride) ?? state.theme;
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return { ...tokens, dark, background: dark ? tokens.night : tokens.bone, text: dark ? tokens['night-text'] : tokens.ink, muted: dark ? '#BAB4A9' : '#686259', rule: dark ? '#514C44' : tokens.travertine, surface: dark ? '#22211E' : tokens.paper };
}
export function useReducedMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduce); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce); return () => sub.remove(); }, []);
  return reduce;
}
export function Copy({ children, kind = 'body', style, testID }: { children: React.ReactNode; kind?: 'body' | 'title' | 'heading' | 'label' | 'small' | 'number'; style?: TextStyle | TextStyle[]; testID?: string }) {
  const t = useTheme();
  return <Text testID={testID} accessibilityRole={kind === 'title' || kind === 'heading' ? 'header' : undefined} style={[styles[kind], { color: kind === 'small' || kind === 'label' ? t.muted : t.text }, style]}>{children}</Text>;
}
export function Screen({ children, title, eyebrow, scroll = true }: { children: React.ReactNode; title?: string; eyebrow?: string; scroll?: boolean }) {
  const t = useTheme(); const { storageError } = useDemo();
  const content = <View style={styles.content}><View style={styles.masthead}><Copy kind="label">DR. PROP / PROPERTY CLINIC</Copy><Copy kind="small">Preview · no live bookings</Copy></View>{eyebrow && <Copy kind="label">{eyebrow}</Copy>}{title && <Copy kind="title">{title}</Copy>}{storageError ? <Message>{storageError}</Message> : null}{children}</View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView> : content}</SafeAreaView>;
}
export function Button({ title, onPress, solid = false, disabled = false, testID }: { title: string; onPress: () => void; solid?: boolean; disabled?: boolean; testID?: string }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID} style={({ pressed }) => [styles.button, { backgroundColor: solid ? t.text : 'transparent', borderColor: t.rule, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={[styles.body, { color: solid ? t.background : t.text, textAlign: 'center' }]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return <View style={{ gap: 8 }}><Copy kind="label">{label}</Copy><TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.muted} selectionColor={t.bronze} style={[styles.input, { color: t.text, borderColor: t.rule, backgroundColor: t.surface }, props.style]} /></View>;
}
export function Rule() { const t = useTheme(); return <View style={{ height: 1, backgroundColor: t.rule, marginVertical: 16 }} />; }
export function Section({ children }: { children: React.ReactNode }) { return <View style={{ gap: 16, marginTop: 32 }}>{children}</View>; }
export function Message({ children }: { children: React.ReactNode }) { return <View accessibilityRole="alert" style={{ paddingVertical: 12 }}><Copy kind="small">{children}</Copy></View>; }
export function Choice({ title, detail, selected, onPress, disabled = false }: { title: string; detail?: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const t = useTheme(); return <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} style={{ paddingVertical: 18, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: t.rule, borderLeftWidth: 2, borderLeftColor: selected ? t.text : 'transparent', backgroundColor: selected ? t.surface : 'transparent', gap: 8, opacity: disabled ? 0.45 : 1 }}><Copy>{title}</Copy>{detail && <Copy kind="small">{detail}</Copy>}</Pressable>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 16 },
  masthead: { gap: 6, paddingBottom: 32 },
  title: { fontFamily: 'InstrumentSerif', fontSize: 48, lineHeight: 52, fontWeight: '400', marginBottom: 8 },
  heading: { fontFamily: 'InstrumentSerif', fontSize: 32, lineHeight: 38 },
  body: { fontFamily: 'Geist', fontSize: 16, lineHeight: 25 },
  small: { fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
  label: { fontFamily: 'GeistMono', fontSize: 11, lineHeight: 18, letterSpacing: 1.2 },
  number: { fontFamily: 'GeistMono', fontSize: 28, lineHeight: 38 },
  input: { fontFamily: 'Geist', minHeight: 52, fontSize: 16, padding: 12, borderWidth: 1, borderRadius: 2 },
  button: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderRadius: 2, padding: 12 },
});
