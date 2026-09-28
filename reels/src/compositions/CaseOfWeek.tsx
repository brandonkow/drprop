/**
 * R2 — case of the week (30–45 s): a generic clay house, one question, four
 * short lines, the problem area pulsing in bronze. Episodes: data/cases/*.json.
 */
import { buildClayHouse } from '@drprop/brand/3d';
import { beatEnvelope, ECG } from '@drprop/brand/pulse/forms';
import { color } from '@drprop/brand/tokens';
import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Box3, Vector3 } from 'three';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { ClayHouse3D } from '../components/Models';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox, fitDistance } from '../components/SafeBox';
import { Stage3D } from '../components/Stage3D';
import { CASES } from '../data';
import { FPS, FRAME, safeCenterY, safeRect } from '../layout';

export type CaseOfWeekProps = ReelProps & { caseId: string };

const HOOK = 4 * FPS;
const LINE = Math.round(4.5 * FPS);
const OUTRO = Math.round(2.5 * FPS);

export const caseBodyFrames = (caseId: string) => HOOK + (CASES[caseId]?.en.lines.length ?? 4) * LINE + OUTRO;

function Body({ lang, ratio, caseId }: CaseOfWeekProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ep = CASES[caseId]!;
  const copy = ep[lang];
  const size = useMemo(() => new Box3().setFromObject(buildClayHouse({ type: ep.houseType })).getSize(new Vector3()), [ep.houseType]);
  const H = size.y;
  const { width, height } = FRAME[ratio];
  const body = caseBodyFrames(caseId);
  const turn = progress(frame, 0, body);
  // Frame the whole plot: it turns, so fit its diagonal; perspective needs a generous margin.
  // Tall buildings are also fitted by height: they get about half the safe area,
  // leaving the hook above and the lines below clear.
  const band = (safeRect(ratio).height / height) * 0.5;
  const d = Math.max(
    fitDistance(Math.hypot(size.x, size.z), 0, width / height, 30, 1.45),
    H / (band * 2 * Math.tan((15 * Math.PI) / 180)),
  );
  const angle = -0.7 + turn * 0.5;
  const pulse = frame > HOOK * 0.6 ? (beatEnvelope(frame / fps) - ECG.rest) / (1 - ECG.rest) : 0;

  return (
    <>
      <Stage3D
        centerY={safeCenterY(ratio)}
        background={color.bone}
        camera={{ position: [Math.sin(angle) * d, H * 0.55 + d * 0.2, Math.cos(angle) * d], target: [0, H * 0.5, 0], far: d * 6 }}
        keyLight={{ position: [-30, 60, 40], intensity: 2 }}
      >
        <ClayHouse3D type={ep.houseType} highlight={ep.highlight} pulse={pulse} />
      </Stage3D>
      <SafeBox ratio={ratio} style={{ justifyContent: 'space-between' }}>
        <Caption lang={lang} ratio={ratio} role="display" from={0} to={body} color={color.ink}>
          {copy.hook}
        </Caption>
        <div style={{ position: 'relative', minHeight: '28%' }}>
          {copy.lines.map((line, i) => (
            <div key={line} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
              <Caption lang={lang} ratio={ratio} from={HOOK + i * LINE} to={HOOK + (i + 1) * LINE} color={color.ink}>
                {line}
              </Caption>
            </div>
          ))}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <Caption lang={lang} ratio={ratio} role="small" from={body - OUTRO} to={body} color={color.stoneText}>
              {COPY.disclaimer[lang]}
            </Caption>
          </div>
        </div>
      </SafeBox>
    </>
  );
}

export function CaseOfWeek(props: CaseOfWeekProps) {
  const ep = CASES[props.caseId]!;
  const copy = ep[props.lang];
  return (
    <ReelFrame
      {...props}
      bodyFrames={caseBodyFrames(props.caseId)}
      text={[copy.hook, ...copy.lines, COPY.disclaimer[props.lang]].join('')}
      body={<Body {...props} />}
    />
  );
}
