/**
 * R5 — this month's market heartbeat (20–30 s): public data drawn as an ECG
 * trace. Data: data/market/*.json, with source and date on screen (§9.7).
 * Files marked "sample" carry a watermark so they cannot be published by mistake.
 */
import { color } from '@drprop/brand/tokens';
import { useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { progress } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox } from '../components/SafeBox';
import { MARKET } from '../data';
import { FONTS } from '../fonts';
import { FPS, safeRect, TYPE } from '../layout';

export type MarketPulseProps = ReelProps & { monthId: string };
export const marketPulseFrames = 20 * FPS;
const DRAW_START = 2 * FPS;
const DRAW_END = 13 * FPS;

function Body({ lang, ratio, monthId }: MarketPulseProps) {
  const frame = useCurrentFrame();
  const m = MARKET[monthId]!;
  const s = safeRect(ratio);
  const w = s.width;
  const h = s.height * 0.42;
  const vals = m.series.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const n = m.series.length;
  // A flat lead-in and lead-out, like a monitor trace, around the data.
  const lead = w * 0.08;
  const xs = m.series.map((_, i) => lead + (i / (n - 1)) * (w - lead * 2));
  const ys = vals.map((v) => h * 0.85 - ((v - lo) / (hi - lo || 1)) * h * 0.7);
  const d = `M0 ${ys[0]} L${lead} ${ys[0]} ${xs.map((x, i) => `L${x} ${ys[i]}`).join(' ')} L${w} ${ys[n - 1]}`;
  const draw = progress(frame, DRAW_START, DRAW_END);
  const shown = Math.floor(draw * (n - 1) + 1e-6);
  const small = TYPE[ratio].small;

  return (
    <>
      <SafeBox ratio={ratio} style={{ justifyContent: 'space-between' }}>
        <Caption lang={lang} ratio={ratio} role="display" from={0} to={marketPulseFrames} color={color.ink}>
          {m.label[lang]}
        </Caption>
        <div style={{ position: 'relative', width: w, height: h + small * 2.4 }}>
          <svg width={w} height={h} style={{ overflow: 'visible' }}>
            <path d={d} fill="none" stroke={color.ink} strokeWidth={3} strokeLinejoin="miter" pathLength={1} strokeDasharray={`${draw} 1`} />
            {draw >= 1 ? <circle cx={xs[n - 1]} cy={ys[n - 1]} r={8} fill={color.bronze} /> : null}
          </svg>
          {m.series.map((p, i) =>
            i <= shown ? (
              <div
                key={p.label}
                style={{
                  position: 'absolute',
                  left: xs[i]! - 60,
                  width: 120,
                  top: h + small * 0.4,
                  textAlign: 'center',
                  fontFamily: FONTS.mono,
                  fontSize: small * 0.9,
                  color: color.stoneText,
                  opacity: progress(frame, DRAW_START + (i / (n - 1)) * (DRAW_END - DRAW_START), DRAW_START + (i / (n - 1)) * (DRAW_END - DRAW_START) + 12),
                }}
              >
                {i % 2 === (n - 1) % 2 ? p.label : ''}
              </div>
            ) : null,
          )}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: ys[n - 1]! - TYPE[ratio].body * 2.2,
              fontFamily: FONTS.mono,
              fontSize: TYPE[ratio].body * 1.2,
              color: color.ink,
              opacity: progress(frame, DRAW_END, DRAW_END + 20),
            }}
          >
            {vals[n - 1]!.toFixed(1)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Caption lang={lang} ratio={ratio} role="small" from={DRAW_START} to={marketPulseFrames} color={color.stoneText}>
            {COPY.market.source[lang]}: {m.source} · {m.date}
          </Caption>
          <Caption lang={lang} ratio={ratio} role="small" from={DRAW_END} to={marketPulseFrames} color={color.stoneText}>
            {COPY.disclaimer[lang]}
          </Caption>
        </div>
      </SafeBox>
      {m.sample ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-24deg)',
            fontFamily: FONTS.mono,
            fontSize: 44,
            letterSpacing: '0.12em',
            color: 'rgba(140,106,67,0.35)',
            pointerEvents: 'none',
          }}
        >
          {COPY.market.sample[lang]}
        </div>
      ) : null}
    </>
  );
}

export function MarketPulse(props: MarketPulseProps) {
  const m = MARKET[props.monthId]!;
  return (
    <ReelFrame
      {...props}
      bodyFrames={marketPulseFrames}
      text={[m.label[props.lang], COPY.market.source[props.lang], COPY.disclaimer[props.lang], COPY.market.sample[props.lang]].join('')}
      body={<Body {...props} />}
    />
  );
}
