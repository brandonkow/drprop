import React from 'react';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { View } from 'react-native';
const source = Skia.RuntimeEffect.Make(`
uniform float2 size; uniform float tilt;
half4 main(float2 p) {
  float2 uv = p / size;
  float brush = fract(sin(floor(p.y * 2.0) * 12.9898) * 43758.5453) * 0.012;
  float sheen = exp(-pow((uv.x + uv.y * 0.35 - 0.6 - tilt * 0.2) * 4.5, 2.0)) * 0.055;
  return half4(float3(0.079, 0.078, 0.070) + brush + sheen, 1.0);
}`);
export default function CardSurface({ width, height, tilt }: { width: number; height: number; tilt: number }) {
  if (!source) return <View style={{ position: 'absolute', width, height, backgroundColor: '#141412' }} />;
  return <Canvas style={{ position: 'absolute', width, height }}><Fill><Shader source={source} uniforms={{ size: [width, height], tilt }} /></Fill></Canvas>;
}
