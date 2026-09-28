import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { tokens } from '../tokens';
import { safeZone } from '../layout';
import type { ReelProps } from '../types';
let fonts: Promise<void[]> | undefined;
export function ensureFonts() { return fonts ??= Promise.all(['Geist', 'GeistMono', 'InstrumentSerif'].map(family => loadFont({ family, url: staticFile(`fonts/${family}.woff2`), weight: '400' }))); }
export function SafeZoneOverlay() {
  const { width, height } = useVideoConfig(); const zone = safeZone(width, height);
  return <div style={{ position: 'absolute', left: zone.left, top: zone.top, width: zone.width, height: zone.height, border: '2px dashed #8C6A43', pointerEvents: 'none', zIndex: 99 }}><span style={{ background: tokens.paper, color: tokens.ink, fontSize: 18 }}>SAFE TEXT AREA / DEBUG ONLY</span></div>;
}
export function Frame({ children, showSafeZone, dark = false, audioSrc, label = 'PROPERTY CLINIC', disclaimer = false }: Pick<ReelProps, 'showSafeZone' | 'audioSrc'> & { children: React.ReactNode; dark?: boolean; label?: string; disclaimer?: boolean }) {
  const { width, height } = useVideoConfig(); const zone = safeZone(width, height);
  const [handle] = useState(() => delayRender('Loading local brand fonts'));
  useEffect(() => { ensureFonts().then(() => continueRender(handle)).catch(cancelRender); }, [handle]);
  return <AbsoluteFill style={{ backgroundColor: dark ? tokens.night : tokens.bone, color: dark ? tokens['night-text'] : tokens.ink, fontFamily: 'Geist', overflow: 'hidden' }}>
    <div data-safe-content style={{ position: 'absolute', left: zone.left, top: zone.top, width: zone.width, height: zone.height, display: 'flex', flexDirection: 'column' }}>
      <div data-safe-text style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 18, letterSpacing: 2, fontFamily: 'GeistMono', lineHeight: 1.4 }}><span>DR. PROP</span><span>{label}</span></div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 40, marginBottom: 32 }}>{children}</div>
      <div data-safe-text style={{ fontSize: 18, lineHeight: 1.5 }}>{disclaimer ? 'General information, not personal advice.' : 'Before you sign, see the doctor.'}</div>
    </div>
    {showSafeZone && <SafeZoneOverlay />}{audioSrc && <Audio src={staticFile(audioSrc)} />}
  </AbsoluteFill>;
}
export function Caption({ children, size = 72, opacity = 1 }: { children: React.ReactNode; size?: number; opacity?: number }) {
  return <div data-safe-text style={{ fontFamily: 'InstrumentSerif', fontSize: size, lineHeight: 1.08, fontWeight: 400, whiteSpace: 'pre-line', opacity }}>{children}</div>;
}
