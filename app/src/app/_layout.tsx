import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DemoProvider, useDemo } from '../state/demo';
import { Copy, Screen, useReducedMotion, useTheme } from '../components/ui';

function Routes() {
  const { state, ready } = useDemo(); const t = useTheme(); const reduce = useReducedMotion();
  const [fonts, error] = useFonts({
    Geist: require('@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf'),
    GeistMono: require('@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf'),
    InstrumentSerif: require('@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf'),
  });
  if (!ready || (!fonts && !error)) return <Screen><Copy kind="title">DR. PROP</Copy><Copy>Preparing your preview.</Copy></Screen>;
  return <><StatusBar style={t.dark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.background }, animation: reduce ? 'none' : 'fade', animationDuration: 600 }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={!state.user}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Protected guard={!!state.user}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="booking" /><Stack.Screen name="membership" /><Stack.Screen name="record/[id]" />
    </Stack.Protected>
    <Stack.Screen name="+not-found" />
  </Stack></>;
}
export default function Root() { return <DemoProvider><Routes /></DemoProvider>; }
