/**
 * R8 — member card (7–10 s): the dark metal card turns slowly to face camera
 * under one sweeping light; the member number is engraved.
 */
import { MEMBER_CARD_SIZE } from '@drprop/brand/3d';
import { color } from '@drprop/brand/tokens';
import { interpolate, useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { MemberCard3D } from '../components/Models';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox, fitDistance } from '../components/SafeBox';
import { Stage3D } from '../components/Stage3D';
import { FPS, FRAME, safeCenterY } from '../layout';

export type MemberCardRevealProps = ReelProps & { memberNo: string };
export const memberCardFrames = 8 * FPS;

function Body({ lang, ratio, memberNo }: MemberCardRevealProps) {
  const frame = useCurrentFrame();
  const { width, height } = FRAME[ratio];
  const turn = progress(frame, 0, 5 * FPS);
  const d = fitDistance(MEMBER_CARD_SIZE.width, MEMBER_CARD_SIZE.height, width / height, 30, width > height ? 2.1 : 1.45);
  const sweep = interpolate(frame, [0, memberCardFrames], [-3, 3]);
  return (
    <>
      <Stage3D
        centerY={safeCenterY(ratio)}
        background={color.night}
        camera={{ position: [0, 0, d], target: [0, -0.04, 0] }}
        environment={0.35}
        keyLight={{ position: [sweep, 2.2, 1.5], intensity: 3.2, color: '#fff3e2' }}
      >
        <MemberCard3D memberNo={memberNo} rotationY={interpolate(turn, [0, 1], [-1.25, 0.1])} rotationX={-0.08} />
      </Stage3D>
      <SafeBox ratio={ratio} style={{ justifyContent: 'flex-end', gap: 16 }}>
        <Caption lang={lang} ratio={ratio} role="display" from={4 * FPS} to={memberCardFrames} color={color.nightText}>
          {COPY.card.line[lang]}
        </Caption>
        <Caption lang={lang} ratio={ratio} role="small" from={5 * FPS} to={memberCardFrames} color={color.stone}>
          {COPY.card.sub[lang]}
        </Caption>
      </SafeBox>
    </>
  );
}

export function MemberCardReveal(props: MemberCardRevealProps) {
  return (
    <ReelFrame
      {...props}
      dark
      bodyFrames={memberCardFrames}
      text={COPY.card.line[props.lang] + COPY.card.sub[props.lang]}
      body={<Body {...props} />}
    />
  );
}
