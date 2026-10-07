/**
 * Wraps every reel: background, fonts, the body, the brand end card (the R1
 * sign-off with the sound logo, brief §9.6), and the optional safe-zone overlay.
 */
import { color } from '@drprop/brand/tokens';
import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Lang } from '../copy';
import { useFonts } from '../fonts';
import { FRAME, safeRect, type Ratio } from '../layout';
import { progress } from './motion';
import { PulseLine } from './PulseLine';
import { SafeZoneOverlay } from './SafeZoneOverlay';
import { Wordmark } from './Wordmark';

export const END_CARD_FRAMES = 75;

// A type alias (not an interface) so Remotion can treat it as Record<string, unknown>.
export type ReelProps = {
  lang: Lang;
  ratio: Ratio;
  showSafeZone?: boolean;
};

/**
 * The sound logo (brief §9.6), when brand/audio/sound-logo.wav exists. Its note
 * lands at frame 46, when the end card's line has folded into the roof.
 */
export const SOUND_LOGO_NOTE_FRAME = 46;
export function SoundLogo() {
  const present = getStaticFiles().some((f) => f.name === 'audio/sound-logo.wav');
  return present ? <Audio src={staticFile('audio/sound-logo.wav')} /> : null;
}

/** The brand sign-off: one beat folds into the roof, DR. PROP fades in. */
export function EndCard({ ratio, dark = false }: { ratio: Ratio; dark?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width } = FRAME[ratio];
  const safe = safeRect(ratio);
  const ink = dark ? color.nightText : color.ink;
  // Sized to the safe area's shorter side, so the line and the wordmark fit any format (16:9 included).
  const lineW = Math.min(safe.width, safe.height * 0.9);
  const groupH = lineW * 0.44; // line + gap + wordmark
  const fold = progress(frame, 18, 48);
  const mark = progress(frame, 36, 62);
  return (
    <AbsoluteFill style={{ backgroundColor: dark ? color.night : color.bone }}>
      <div style={{ position: 'absolute', left: (width - lineW) / 2, top: safe.y + (safe.height - groupH) / 2, width: lineW }}>
        <PulseLine
          width={lineW}
          height={lineW * 0.16}
          baseline={lineW * 0.2}
          progress={0.25 + 0.25 * fold}
          time={frame / fps}
          color={ink}
          strokeWidth={Math.max(3, width / 360)}
          apex={0.5}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: lineW * 0.1, opacity: mark }}>
          <Wordmark width={lineW * 0.52} color={ink} />
        </div>
      </div>
      <SoundLogo />
    </AbsoluteFill>
  );
}

export function ReelFrame({
  lang,
  ratio,
  showSafeZone,
  body,
  bodyFrames,
  dark = false,
  endCard = true,
  text = '',
}: ReelProps & {
  body: ReactNode;
  bodyFrames: number;
  dark?: boolean;
  endCard?: boolean;
  /** All text shown, so the right font slices load before rendering. */
  text?: string;
}) {
  useFonts(lang, text);
  return (
    <AbsoluteFill style={{ backgroundColor: dark ? color.night : color.bone, color: dark ? color.nightText : color.ink }}>
      <Sequence durationInFrames={bodyFrames} name="body">
        {body}
      </Sequence>
      {endCard ? (
        <Sequence from={bodyFrames} durationInFrames={END_CARD_FRAMES} name="end card">
          <EndCard ratio={ratio} dark={dark} />
        </Sequence>
      ) : null}
      {showSafeZone ? <SafeZoneOverlay ratio={ratio} /> : null}
    </AbsoluteFill>
  );
}
