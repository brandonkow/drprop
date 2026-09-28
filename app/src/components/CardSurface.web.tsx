import React from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
export default function CardSurface({ width, height, tilt }: { width: number; height: number; tilt: number }) {
  // Native uses Skia; this lightweight preview does not require CanvasKit.
  return <Svg width={width} height={height} style={{ position: 'absolute' }}><Defs><LinearGradient id="metal" x1="0" y1="0" x2="1" y2="0.35"><Stop offset="0" stopColor="#141412" /><Stop offset={0.6 + tilt * 0.15} stopColor="#292821" /><Stop offset="1" stopColor="#141412" /></LinearGradient></Defs><Rect width={width} height={height} fill="url(#metal)" />{Array.from({ length: Math.ceil(height / 4) }, (_, i) => <Rect key={i} x="0" y={i * 4} width={width} height={0.4} fill="#EDE9E1" opacity={0.025} />)}</Svg>;
}
