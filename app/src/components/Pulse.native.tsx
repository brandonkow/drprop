import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion, useTheme } from './ui';
export function Pulse({ animate = false, light = false }: { animate?: boolean; light?: boolean }) {
  const t = useTheme(); const reduced = useReducedMotion(); const [width, setWidth] = useState(320); const progress = useSharedValue(1);
  useEffect(() => { progress.value = 0; progress.value = withTiming(1, { duration: reduced || !animate ? 0 : 800, easing: Easing.out(Easing.cubic) }); }, [animate, reduced, progress]);
  const path = useDerivedValue(() => Skia.Path.MakeFromSVGString(`M0 55 H102 L130 ${55-28*progress.value} L158 55 H180 L196 ${55-42*progress.value} L212 55 H320`)!);
  return <View accessible accessibilityLabel="Pulse Roof" onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{height:90,width:'100%'}}><Canvas style={{width,height:90}}><Group transform={[{scaleX:width/320}]}><Path path={path} color={light?t['night-text']:t.text} style="stroke" strokeWidth={1.5} end={progress} /></Group></Canvas></View>;
}
