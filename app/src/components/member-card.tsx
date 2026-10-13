/**
 * S5 member card (brief §8.3): night card, hairline Pulse Roof, member number in
 * Geist Mono, member name, and a very faint brushed-metal sheen that follows the
 * phone's tilt (DeviceMotion). Motion is opt-in; denied permissions and reduced motion keep the card static.
 */
import { LOGO } from '@drprop/brand/logo/paths';
import { color } from '@drprop/brand/tokens';
import { Canvas, Fill, Group, Path, Shader, Skia, vec } from '@shopify/react-native-skia';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { cardTilt } from './card-motion';
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

  const [enabled, setEnabled] = useState(false);
  const [motionMessage, setMotionMessage] = useState('Enable card motion');

  useEffect(() => {
    let live = true;
    let generation = 0;
    let reduced = true;
    let sub: { remove(): void } | undefined;
    const stop = () => { generation++; sub?.remove(); sub = undefined; tilt.set({ x: 0, y: 0 }); };
    const start = async () => {
      stop();
      const ticket = generation;
      if (!enabled || reduced || AppState.currentState !== 'active') return;
      try {
        const ok = await DeviceMotion.isAvailableAsync();
        if (!live || ticket !== generation || !ok) return;
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          const target = cardTilt(rotation.beta, rotation.gamma);
          const prev = tilt.get();
          tilt.set({ x: prev.x + (target.x - prev.x) * 0.2, y: prev.y + (target.y - prev.y) * 0.2 });
        });
      } catch { /* Static card remains available without motion. */ }
    };
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { reduced = value; void start(); });
    const foreground = AppState.addEventListener('change', () => { void start(); });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (live) { reduced = value; void start(); } }).catch(() => {});
    return () => { live = false; stop(); preference.remove(); foreground.remove(); };
  }, [enabled, tilt]);

  const enableMotion = async () => {
    if (enabled) { setEnabled(false); setMotionMessage('Enable card motion'); return; }
    try {
      // Request directly from the press gesture, including on mobile web.
      const permission = await DeviceMotion.requestPermissionsAsync();
      setEnabled(permission.granted);
      setMotionMessage(permission.granted ? 'Disable card motion' : 'Motion unavailable; card remains usable');
    } catch { setMotionMessage('Motion unavailable; card remains usable'); }
  };

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
    <View style={[s.card, { width, height }]} accessibilityLabel={`DR. PROP · ${name} · ${memberNo}`}>
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
      <Pressable accessibilityRole="button" accessibilityLabel={motionMessage} onPress={() => void enableMotion()} style={{ position: 'absolute', top: 8, right: 8, minHeight: 44, justifyContent: 'center', maxWidth: width * 0.45 }}>
        <Text style={{ color: color.nightText, fontFamily: FONT.body, fontSize: 11 }}>{motionMessage}</Text>
      </Pressable>
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
