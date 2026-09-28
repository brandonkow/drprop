import React, { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion, useTheme } from './ui';
const AnimatedPath = Animated.createAnimatedComponent(Path);
export function Pulse({ animate = false, light = false }: { animate?: boolean; light?: boolean }) {
  const t = useTheme(); const reduced = useReducedMotion(); const progress = useSharedValue(animate && !reduced ? 0 : 1);
  useEffect(() => { progress.value = 0; progress.value = withTiming(1, { duration: reduced || !animate ? 0 : 800, easing: Easing.out(Easing.cubic) }); }, [animate, reduced, progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 420 * (1 - progress.value), d: `M0 55 H102 L130 ${55 - 28 * progress.value} L158 55 H180 L196 ${55 - 42 * progress.value} L212 55 H320` }));
  return <Svg width="100%" height={90} viewBox="0 0 320 90" accessibilityLabel="Pulse Roof" role="img"><AnimatedPath animatedProps={props} fill="none" stroke={light ? t['night-text'] : t.text} strokeWidth={1.5} strokeDasharray={420} /></Svg>;
}
