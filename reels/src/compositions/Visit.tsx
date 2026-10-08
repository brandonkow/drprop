/**
 * R9 — a visit (≈ 16 s): arrive, your kopi, the Lounge. Three photoreal concept
 * clips from brand/renders/ai (generated people), so every shot says "Concept
 * imagery." under its words. Night background; in tall formats the clip sits in a band at the top of
 * the safe area with the words under it, in 16:9 it fills the frame. On 9:16 the
 * arrival is the vertical blue-hour clip, full height, with the words over the
 * plain wall above the shopfront.
 */
import { color } from '@drprop/brand/tokens';
import type { CSSProperties } from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { COPY, type Lang } from '../copy';
import { Caption } from '../components/Caption';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox } from '../components/SafeBox';
import { FRAME, safeRect, type Ratio } from '../layout';

/** Frames per clip: the clips run five seconds. */
const SCENE = 140;
const FADE = 12;

interface Scene {
  src: string;
  line: string;
  sub: string;
  /** Fills the frame (16:9, or the vertical clip on 9:16) instead of sitting in a band. */
  full: boolean;
}

function scenes(lang: Lang, ratio: Ratio): Scene[] {
  const tall = ratio === '9x16';
  return [
    {
      src: tall ? 'renders/ai/clip-street-vertical.mp4' : 'renders/ai/clip-mall-walk-in.mp4',
      line: COPY.visit.arrive[lang],
      sub: COPY.tagline[lang],
      full: tall || ratio === '16x9',
    },
    { src: 'renders/ai/clip-kopi.mp4', line: COPY.visit.kopi[lang], sub: COPY.visit.kopiSub[lang], full: ratio === '16x9' },
    { src: 'renders/ai/clip-mall-lounge.mp4', line: COPY.lounge.line[lang], sub: COPY.lounge.sub[lang], full: ratio === '16x9' },
  ];
}

export const visitFrames = 3 * SCENE;

/** The band a clip sits in on tall formats: full width, from the top of the safe area, leaving room for three lines under it. */
const bandHeight = (ratio: Ratio) => Math.round(FRAME[ratio].width * (ratio === '9x16' ? 0.46 : 0.62));

function Shot({ scene, lang, ratio, first }: { scene: Scene; lang: Lang; ratio: Ratio; first: boolean }) {
  const frame = useCurrentFrame();
  const { width, height } = FRAME[ratio];
  const safe = safeRect(ratio);
  const opacity = Math.min(first ? 1 : progress(frame, 0, FADE), 1 - progress(frame, SCENE - FADE, SCENE));
  const push = interpolate(frame, [0, SCENE], [1, 1.03]);
  const box = scene.full ? { left: 0, top: 0, width, height } : { left: 0, top: safe.y, width, height: bandHeight(ratio) };
  // Words: under the band; lower left over a 16:9 picture; at the top over the wall on the vertical clip.
  const words: CSSProperties = !scene.full
    ? { paddingTop: bandHeight(ratio) + safe.height * 0.05, gap: safe.height * 0.025 }
    : ratio === '16x9'
      ? { justifyContent: 'flex-end', paddingBottom: safe.height * 0.12, gap: safe.height * 0.02 }
      : { gap: safe.height * 0.025 };
  // Over a picture the words carry a soft shadow (no scrims or gradients, brief §5.6).
  const shadow = scene.full ? { textShadow: '0 1px 3px rgba(20,20,18,0.45), 0 2px 30px rgba(20,20,18,0.65)' } : undefined;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', ...box, overflow: 'hidden' }}>
        <OffthreadVideo src={staticFile(scene.src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})` }} />
      </div>
      <SafeBox ratio={ratio} style={words}>
        <Caption lang={lang} ratio={ratio} role="display" from={16} to={SCENE - 4} color={color.nightText} style={shadow}>
          {scene.line}
        </Caption>
        <Caption lang={lang} ratio={ratio} from={34} to={SCENE - 4} color={color.nightText} style={shadow}>
          {scene.sub}
        </Caption>
        {/* Generated people: every shot says so, with the words, so it never collides with them. */}
        <Caption lang={lang} ratio={ratio} role="small" from={34} to={SCENE - 4} color={color.stone} style={shadow}>
          {COPY.visit.concept[lang]}
        </Caption>
      </SafeBox>
    </AbsoluteFill>
  );
}

function Body({ lang, ratio }: ReelProps) {
  const list = scenes(lang, ratio);
  return (
    <AbsoluteFill style={{ backgroundColor: color.night }}>
      {list.map((scene, i) => (
        <Sequence key={scene.src} from={i * SCENE} durationInFrames={SCENE} name={`shot ${i + 1}`}>
          <Shot scene={scene} lang={lang} ratio={ratio} first={i === 0} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export function Visit(props: ReelProps) {
  const text = scenes(props.lang, props.ratio)
    .map((s) => s.line + s.sub)
    .join('');
  return <ReelFrame {...props} dark bodyFrames={visitFrames} text={text + COPY.visit.concept[props.lang]} body={<Body {...props} />} />;
}
