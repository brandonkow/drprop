/**
 * R6 — Lounge moment, rendered version (10–15 s): a slow push to the apothecary
 * wall; one drawer slides out. After opening this becomes real footage.
 */
import { color } from '@drprop/brand/tokens';
import { interpolate, useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { Apothecary3D } from '../components/Models';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox, fitDistance } from '../components/SafeBox';
import { Stage3D } from '../components/Stage3D';
import { FPS, FRAME, safeCenterY } from '../layout';

export const loungeMomentFrames = 12 * FPS;

function Body({ lang, ratio }: ReelProps) {
  const frame = useCurrentFrame();
  const { width, height } = FRAME[ratio];
  const push = progress(frame, 0, loungeMomentFrames);
  const d = fitDistance(1.45, 1.35, width / height, 30, 2) * interpolate(push, [0, 1], [1.15, 0.85]);
  const open = progress(frame, 4 * FPS, 7 * FPS);
  return (
    <>
      <Stage3D
        centerY={safeCenterY(ratio)}
        background={color.bone}
        camera={{ position: [0.35 * d, 0.95, d], target: [0, 0.72, 0] }}
        keyLight={{ position: [-2, 3, 2.5], intensity: 1.8, color: '#ffd9a8' }}
        environment={0.7}
      >
        <Apothecary3D open={open} />
      </Stage3D>
      <SafeBox ratio={ratio} style={{ justifyContent: 'space-between' }}>
        <Caption lang={lang} ratio={ratio} role="display" from={FPS} to={loungeMomentFrames} color={color.ink}>
          {COPY.lounge.line[lang]}
        </Caption>
        <Caption lang={lang} ratio={ratio} from={5 * FPS} to={loungeMomentFrames} color={color.ink}>
          {COPY.lounge.sub[lang]}
        </Caption>
      </SafeBox>
    </>
  );
}

export function LoungeMoment(props: ReelProps) {
  return (
    <ReelFrame
      {...props}
      bodyFrames={loungeMomentFrames}
      text={COPY.lounge.line[props.lang] + COPY.lounge.sub[props.lang]}
      body={<Body {...props} />}
    />
  );
}
