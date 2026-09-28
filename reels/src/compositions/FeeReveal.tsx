/**
 * R4 — "What does it cost?" (15 s): the property value rolls up, the fee
 * follows the published bands (brief §3.2), ending on "prices on our door".
 */
import { bandFor } from '@drprop/brand/pricing';
import { color } from '@drprop/brand/tokens';
import { interpolate, useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { ease, progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox } from '../components/SafeBox';
import { FONTS } from '../fonts';
import { FPS, safeRect, TYPE } from '../layout';

export const feeRevealFrames = Math.round(12.5 * FPS);
const ROLL_START = Math.round(1.4 * FPS);
/** One stop per fee band: count up for 0.5 s, then hold for 0.9 s. */
const STOPS = [250_000, 480_000, 850_000, 1_600_000, 3_000_000];
const STEP = Math.round(1.4 * FPS);
const COUNT = Math.round(0.5 * FPS);
const ROLL_END = ROLL_START + STOPS.length * STEP;
const OUTRO = ROLL_END + 10;

const rm = (n: number) => `RM ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

function Body({ lang, ratio }: ReelProps) {
  const frame = useCurrentFrame();
  const s = safeRect(ratio);
  const i = Math.min(STOPS.length - 1, Math.max(0, Math.floor((frame - ROLL_START) / STEP)));
  const from = i === 0 ? 150_000 : STOPS[i - 1]!;
  const stepStart = ROLL_START + i * STEP;
  const t = interpolate(frame, [stepStart, stepStart + COUNT], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const value = Math.round((from + (STOPS[i]! - from) * t) / 10_000) * 10_000;
  const fee = bandFor(value)!.fee;
  const numbers = progress(frame, ROLL_START - 15, ROLL_START) * (1 - progress(frame, ROLL_END, ROLL_END + 15));
  const size = TYPE[ratio].display;

  return (
    <SafeBox ratio={ratio} style={{ justifyContent: 'space-between' }}>
      <Caption lang={lang} ratio={ratio} role="display" from={0} to={ROLL_END + 15} color={color.ink}>
        {COPY.fee.title[lang]}
      </Caption>
      <div style={{ opacity: numbers, display: 'flex', flexDirection: 'column', gap: s.height * 0.02 }}>
        <div style={{ fontFamily: FONTS.body, fontSize: TYPE[ratio].small, color: color.stoneText, letterSpacing: '0.04em' }}>
          {COPY.fee.value[lang]}
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: size * 0.72, color: color.ink }}>{rm(value)}</div>
        <div style={{ height: s.height * 0.04 }} />
        <div style={{ fontFamily: FONTS.body, fontSize: TYPE[ratio].small, color: color.stoneText, letterSpacing: '0.04em' }}>
          {COPY.fee.fee[lang]}
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: size * 1.2, color: color.bronze }}>{rm(fee)}</div>
      </div>
      <Caption lang={lang} ratio={ratio} role="display" from={OUTRO} to={feeRevealFrames} color={color.ink}>
        {COPY.fee.outro[lang]}
      </Caption>
    </SafeBox>
  );
}

export function FeeReveal(props: ReelProps) {
  const c = COPY.fee;
  return (
    <ReelFrame
      {...props}
      bodyFrames={feeRevealFrames}
      text={[c.title, c.value, c.fee, c.outro].map((x) => x[props.lang]).join('')}
      body={<Body {...props} />}
    />
  );
}
