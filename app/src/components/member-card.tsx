/**
 * S5 member card (brief §8.3): night card, hairline Pulse Roof, member number in
 * Geist Mono, member name, and a very faint brushed-metal sheen that follows the
 * phone's tilt (DeviceMotion). Without a motion sensor the sheen drifts slowly.
 */
import { LOGO } from '@drprop/brand/logo/paths';
import { color } from '@drprop/brand/tokens';
import { Canvas, Fill, Group, Path, Shader, Skia, vec } from '@shopify/react-native-skia';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FONT, SIZE, SPACE } from '../theme';
import { pulseForms } from './pulse-paths';

/**
 * Brushed metal: fine horizontal streaks plus one soft diagonal highlight whose
 * position follows the tilt. Deliberately faint — a real card under a lamp.
 */
const METAL = Skia.RuntimeEffect.Make(`
uniform float2 uSize;
uniform float2 uTilt;

float hash(float n) { return fract(sin(n) * 43758.5453); }

half4 main(float2 p) {
  float2 uv = p / uSize;
  half3 base = mix(half3(0.098, 0.094, 0.086), half3(0.071, 0.069, 0.063), uv.y);
  float row = floor(p.y);
  float seg = floor(p.x / 140.0 + hash(row) * 3.0);
  float streak = (hash(row * 1.7 + seg * 13.1) - 0.5) * 0.022;
  float d = dot(uv - 0.5, normalize(float2(0.55, 1.0)));
  float centre = uTilt.x * 0.5 + uTilt.y * 0.3;
  float band = exp(-pow((d - centre) / 0.14, 2.0)) * 0.075;
  half3 c = base + half3(streak) + half3(band) * half3(1.0, 0.94, 0.84);
  return half4(c, 1.0);
}
`)!;

const wordmark = Skia.Path.MakeFromSVGString(LOGO.wordmark)!;
const logoLine = Skia.Path.MakeFromSVGString(LOGO.line)!;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function MemberCard({
  width,
  height,
  name,
  memberNo,
  caption,
}: {
  width: number;
  height: number;
  name: string;
  memberNo: string;
  caption: string;
}) {
  const tilt = useSharedValue({ x: 0, y: 0 });

  useEffect(() => {
    let sub: { remove(): void } | undefined;
    let cancelled = false;
    DeviceMotion.isAvailableAsync()
      .then((ok) => {
        if (cancelled) return;
        if (!ok) {
          // No sensor (simulator, web): a slow drift keeps the card alive.
          tilt.set(
            withRepeat(withTiming({ x: 0.6, y: -0.3 }, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true),
          );
          return;
        }
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          // beta: front/back tilt around 45° when held; gamma: left/right. Degrees.
          const target = {
            x: clamp(rotation.gamma / 35, -1, 1),
            y: clamp((rotation.beta - 45) / 35, -1, 1),
          };
          const prev = tilt.get();
          tilt.set({ x: prev.x + (target.x - prev.x) * 0.2, y: prev.y + (target.y - prev.y) * 0.2 });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [tilt]);

  const uniforms = useDerivedValue(() => ({
    uSize: vec(width, height),
    uTilt: vec(tilt.get().x, tilt.get().y),
  }));

  const line = useMemo(
    () => pulseForms({ width, height: height * 0.09, baseline: height * 0.5, roof: { apex: 0.64, halfSpan: 0.12 } }).roof,
    [width, height],
  );
  const logoScale = (width * 0.42) / LOGO.width;

  return (
    <View style={[s.card, { width, height }]} accessibilityRole="image" accessibilityLabel={`DR. PROP · ${name} · ${memberNo}`}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={METAL} uniforms={uniforms} />
        </Fill>
        <Path path={line} style="stroke" strokeWidth={1} strokeJoin="miter" color={color.nightText} opacity={0.55} />
        <Group transform={[{ translateX: SPACE[3] }, { translateY: SPACE[3] }, { scale: logoScale }]}>
          <Path path={logoLine} style="stroke" strokeWidth={1.5 / logoScale} strokeJoin="miter" color={color.nightText} />
          <Path path={wordmark} color={color.nightText} />
        </Group>
      </Canvas>
      <View style={s.bottom}>
        <Text style={s.caption}>{caption}</Text>
        <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit>
          {name}
        </Text>
        <Text style={s.number}>{memberNo}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(237,233,225,0.14)',
    backgroundColor: color.night,
  },
  bottom: { position: 'absolute', left: SPACE[3], right: SPACE[3], bottom: SPACE[3], gap: SPACE[1] },
  caption: { fontFamily: FONT.body, fontSize: SIZE.small, color: color.nightText, opacity: 0.6, letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { fontFamily: FONT.display, fontSize: SIZE.display * 0.8, color: color.nightText },
  number: { fontFamily: FONT.mono, fontSize: SIZE.body, color: color.nightText, letterSpacing: 2 },
});
