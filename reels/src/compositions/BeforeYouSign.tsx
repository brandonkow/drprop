/**
 * R3 — five checks before you sign (15–30 s): typography and the pulse line.
 * Each item arrives on a single heartbeat of the line above it.
 */
import { BEAT_PERIOD } from '@drprop/brand/pulse/forms';
import { color } from '@drprop/brand/tokens';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { progress } from '../components/motion';
import { PulseLine } from '../components/PulseLine';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox } from '../components/SafeBox';
import { FPS, safeRect, TYPE } from '../layout';

const TITLE = 3 * FPS;
const ITEM = 3 * FPS;
const OUTRO = 3 * FPS;
export const beforeYouSignFrames = TITLE + 5 * ITEM + OUTRO;

function Body({ lang, ratio }: ReelProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = safeRect(ratio);
  const items = COPY.beforeYouSign.items[lang];
  const current = Math.floor((frame - TITLE) / ITEM);
  // One beat per item: time restarts at each item and stops after one period.
  const sinceItem = frame >= TITLE ? ((frame - TITLE) % ITEM) / fps : 0;
  const time = current >= 0 && current < items.length ? Math.min(sinceItem, BEAT_PERIOD * 0.95) : BEAT_PERIOD * 0.95;
  const lineProgress = progress(frame, 20, TITLE) * 0.25;
  const end = beforeYouSignFrames;

  return (
    <SafeBox ratio={ratio} style={{ gap: s.height * 0.035 }}>
      <Caption lang={lang} ratio={ratio} role="display" from={0} to={end} color={color.ink}>
        {COPY.beforeYouSign.title[lang]}
      </Caption>
      <PulseLine
        width={s.width}
        height={s.height * 0.06}
        baseline={s.height * 0.075}
        progress={lineProgress}
        time={time}
        color={color.ink}
        strokeWidth={3}
        apex={0.18 + Math.max(0, Math.min(current, 4)) * 0.16}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: s.height * 0.022 }}>
        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', gap: TYPE[ratio].body * 0.6, alignItems: 'baseline' }}>
            <Caption lang={lang} ratio={ratio} role="mono" from={TITLE + i * ITEM} to={end} color={color.stoneText}>
              {String(i + 1).padStart(2, '0')}
            </Caption>
            <Caption lang={lang} ratio={ratio} from={TITLE + i * ITEM} to={end} color={color.ink}>
              {item}
            </Caption>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Caption lang={lang} ratio={ratio} from={TITLE + 5 * ITEM} to={end} color={color.ink}>
          {COPY.beforeYouSign.cta[lang]}
        </Caption>
        <Caption lang={lang} ratio={ratio} role="small" from={TITLE + 5 * ITEM} to={end} color={color.stoneText}>
          {COPY.disclaimer[lang]}
        </Caption>
      </div>
    </SafeBox>
  );
}

export function BeforeYouSign(props: ReelProps) {
  const c = COPY.beforeYouSign;
  return (
    <ReelFrame
      {...props}
      bodyFrames={beforeYouSignFrames}
      text={[c.title[props.lang], ...c.items[props.lang], c.cta[props.lang], COPY.disclaimer[props.lang]].join('')}
      body={<Body {...props} />}
    />
  );
}
