import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Copy, Screen, useReducedMotion } from '../components/ui';
import { Pulse } from '../components/Pulse';
import { useDemo } from '../state/demo';
export default function Launch() {
  const { state } = useDemo(); const reduced = useReducedMotion(); const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withDelay(reduced ? 0 : 800, withTiming(1, { duration: reduced ? 0 : 600, easing: Easing.out(Easing.cubic) })); const timer = setTimeout(() => router.replace(state.user ? '/(tabs)/home' : '/onboarding'), reduced ? 100 : 1800); return () => clearTimeout(timer); }, [state.user, reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Screen scroll={false}><View style={{ flex: 1, justifyContent: 'center', paddingBottom: 100 }}><Pulse animate /><Animated.View style={style}><Copy kind="title">DR. PROP</Copy><Copy>Before you sign, see the doctor.</Copy></Animated.View></View></Screen>;
}
