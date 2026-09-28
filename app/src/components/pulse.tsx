/**
 * Pulse Roof line in the app (brief §5.7, S0, S3).
 *   <PulseSplash>  S0: the line draws left to right (800 ms), its peak folds into
 *                  the roof, then DR. PROP fades in
 *   <PulseBeat>    a line that beats once whenever `beat` changes (S3 success)
 */
import { LOGO } from '@drprop/brand/logo/paths';
import { color } from '@drprop/brand/tokens';
import { Canvas, Group, Path, Skia, usePathInterpolation } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useApp } from '../state/app-state';
import { EASE } from '../theme';
import { pulseForms } from './pulse-paths';

const ease = Easing.bezier(...EASE);
const wordmark = Skia.Path.MakeFromSVGString(LOGO.wordmark)!;
const WORD_W = LOGO.width - LOGO.wordmarkX - 2;

export function PulseSplash({ onDone }: { onDone(): void }) {
  const { width, height } = useWindowDimensions();
  const { t } = useApp();
  const lineW = width;
  const forms = useMemo(
    () => pulseForms({ width: lineW, height: 72, baseline: 96, roof: { apex: 0.62, halfSpan: 0.13 } }),
    [lineW],
  );

  const draw = useSharedValue(0);
  const fold = useSharedValue(0);
  const mark = useSharedValue(0);
  const fade = useSharedValue(1);
  const path = usePathInterpolation(fold, [0, 1], [forms.beat, forms.roof]);

  useEffect(() => {
    draw.set(withTiming(1, { duration: 800, easing: ease }));
    fold.set(withDelay(850, withTiming(1, { duration: 700, easing: ease })));
    mark.set(withDelay(1350, withTiming(1, { duration: 700, easing: ease })));
    fade.set(withDelay(2500, withTiming(0, { duration: 600, easing: ease })));
    const done = setTimeout(onDone, 3100);
    return () => clearTimeout(done);
  }, [draw, fold, mark, fade, onDone]);

  const container = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const scale = Math.min(1.6, (width * 0.5) / WORD_W);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.splash, container]} accessible accessibilityLabel="DR. PROP">
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityHint={t.splash.skip}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Canvas style={{ width, height: 200 }}>
            <Path
              path={path}
              end={draw}
              style="stroke"
              strokeWidth={1.5}
              strokeJoin="miter"
              color={color.ink}
            />
            <Group
              opacity={mark}
              transform={[
                { translateX: (width - WORD_W * scale) / 2 - LOGO.wordmarkX * scale },
                { translateY: 150 - LOGO.height * scale * 0.85 },
                { scale },
              ]}
            >
              <Path path={wordmark} color={color.ink} />
            </Group>
          </Canvas>
        </View>
        <View style={{ height: height * 0.15 }} />
      </Pressable>
    </Animated.View>
  );
}

export function PulseBeat({ beat, width, tint }: { beat: number; width: number; tint: string }) {
  const forms = useMemo(() => pulseForms({ width, height: 48, baseline: 60 }), [width]);
  const amp = useSharedValue(0);
  const path = usePathInterpolation(amp, [0, 1], [forms.flat, forms.beat]);
  useEffect(() => {
    if (beat === 0) return;
    amp.set(
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: ease }),
      ),
    );
  }, [beat, amp]);
  return (
    <Canvas style={{ width, height: 80 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path path={path} style="stroke" strokeWidth={1.5} strokeJoin="miter" color={tint} />
    </Canvas>
  );
}

const s = StyleSheet.create({
  splash: { backgroundColor: color.bone, zIndex: 10 },
});
