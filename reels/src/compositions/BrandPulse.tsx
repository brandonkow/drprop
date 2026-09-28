/**
 * R1 — "The Pulse" (7 s / 15 s): the bronze line on a travertine plinth beats,
 * folds into the roof, and DR. PROP appears. Also the source of every reel's
 * sign-off (the 2D EndCard mirrors it).
 */
import { color } from '@drprop/brand/tokens';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { PulseRoof3D } from '../components/Models';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox, fitDistance } from '../components/SafeBox';
import { Stage3D } from '../components/Stage3D';
import { Wordmark } from '../components/Wordmark';
import { FRAME, safeRect, safeCenterY } from '../layout';

export type BrandPulseProps = ReelProps & { length: 7 | 15 };

function Body({ lang, ratio, length }: BrandPulseProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: L } = useVideoConfig();
  const t = frame / fps;
  const beat = progress(frame, L * 0.08, L * 0.22) * 0.25;
  const fold = progress(frame, L * 0.52, L * 0.72) * 0.25;
  const push = progress(frame, 0, L);
  const orbit = length === 15 ? interpolate(push, [0, 1], [-0.35, 0.3]) : 0;
  const { width, height } = FRAME[ratio];
  const d = fitDistance(0.72, 0.4, width / height) * interpolate(push, [0, 1], [1.12, 0.94]);
  const safe = safeRect(ratio);
  const mark = progress(frame, L * 0.74, L * 0.86);

  return (
    <>
      <Stage3D
        centerY={safeCenterY(ratio)}
        background={color.bone}
        camera={{
          position: [Math.sin(orbit) * d, 0.12 + d * 0.16, Math.cos(orbit) * d],
          target: [0, 0.07, 0],
        }}
        keyLight={{ position: [-1.2, 1.6, 1.4], intensity: 2.2 }}
      >
        <PulseRoof3D progress={beat + fold} time={t} />
      </Stage3D>
      <SafeBox ratio={ratio} style={{ justifyContent: 'flex-end', alignItems: 'center', gap: safe.height * 0.03 }}>
        <div style={{ opacity: mark }}>
          <Wordmark width={safe.width * 0.56} color={color.ink} />
        </div>
        {length === 15 ? (
          <Caption lang={lang} ratio={ratio} role="small" from={Math.round(L * 0.82)} to={L} color={color.stoneText} align="center">
            {COPY.tagline[lang]}
          </Caption>
        ) : null}
      </SafeBox>
    </>
  );
}

export function BrandPulse(props: BrandPulseProps) {
  const { durationInFrames } = useVideoConfig();
  return (
    <ReelFrame
      {...props}
      endCard={false}
      bodyFrames={durationInFrames}
      text={COPY.tagline[props.lang]}
      body={<Body {...props} />}
    />
  );
}
