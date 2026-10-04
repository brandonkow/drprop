/**
 * Hero promo (≈ 48 s, English): the whole proposition in one film, for the
 * website, YouTube (16:9) and Reels/TikTok (9:16).
 *
 *   the problem  → everyone around a deal is paid when you sign
 *   the answer   → an independent property clinic (the store, at dusk)
 *   the visit    → welcome, a published fee, the consult, the Lounge
 *   the promise  → "We don't sell. We tell." over the service flow
 *   the ask      → "Before you sign, see the doctor." · book a consult
 *
 * Pictures are the Cycles renders in brand/renders (blender/build_layout_plan.py)
 * set in an editorial frame on bone — never upscaled, never full-bleed filters.
 * Motion follows brief §9.6: slow pushes inside the frame, fades through bone,
 * captions that appear whole. Copy is English only for now (EN needs a
 * native read before publishing, like every reel).
 */
import { bands } from '@drprop/brand/pricing';
import { color } from '@drprop/brand/tokens';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { fadeWindow, progress } from '../components/motion';
import { PulseLine } from '../components/PulseLine';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { FONTS } from '../fonts';
import { FPS, FRAME, safeRect, type Ratio } from '../layout';

const rm = (n: number) => `RM ${n.toLocaleString('en-MY')}`;

export const HERO = {
  open: 'Buying a home is the biggest signature of your life.',
  problem: 'Almost everyone around the deal is paid when you sign.',
  turn: 'We’re not.',
  name: 'Dr Prop. An independent property clinic.',
  nameSub: 'No sales. No commission. Only on your side.',
  welcome: 'Walk in. A cold towel, a long table — no counter.',
  feeTitle: 'The fee follows the property’s value.',
  feeNote: 'Published, capped, and on our door.',
  feeRules: 'Urgent consult: fee + 50%. Review before the deposit: half fee.',
  consult: 'Thirty minutes at a round table. A written diagnosis.',
  consultSub: 'Deciding today? A video consult within two hours.',
  lounge: 'Members drop in any time.',
  loungeSub: 'Kopi, kuih and the market talk. No sales pitch.',
  promise: COPY.tagline.en,
  promiseSub: 'Every visit, start to finish.',
  cta: 'Before you sign, see the doctor.',
  ctaSub: 'Book a consult · Petaling Jaya',
  legal: 'Information and analysis. Not legal, tax or financial advice. No commission, ever.',
};

const feeRows = bands.map((b, i) => ({
  label: b.upTo === null ? `Above ${rm(bands[i - 1]!.upTo!)}` : `Up to ${rm(b.upTo)}`,
  fee: rm(b.fee),
}));

/** Scene timing in frames: [start, end). Fades happen inside each scene. */
const S = {
  open: [0, 120],
  problem: [120, 255],
  name: [255, 405],
  welcome: [405, 570],
  fee: [570, 750],
  consult: [750, 930],
  lounge: [930, 1110],
  promise: [1110, 1260],
  cta: [1260, 1380],
} as const;
export const heroPromoFrames = S.cta[1];

/** Where pictures and words sit, per format. */
function layout(ratio: Ratio) {
  const { width, height } = FRAME[ratio];
  const safe = safeRect(ratio);
  if (ratio === '16x9') {
    const w = 1064;
    const h = Math.round(w / 1.5);
    return {
      pic: { left: width - safe.x - w, top: Math.round((height - h) / 2), width: w, height: h },
      text: { left: safe.x, top: 0, width: width - safe.x * 2 - w - 84, height },
      textAlign: 'center' as const, // vertical alignment of the text column
      display: 70,
      body: 30,
    };
  }
  // 9:16 (and 4:5): the picture full width across the top of the safe area, words beneath.
  const h = Math.round(width / 1.5);
  const top = Math.max(0, safe.y - 40);
  return {
    pic: { left: 0, top, width, height: h },
    text: { left: safe.x, top: top + h + 44, width: safe.width, height: safe.y + safe.height - (top + h + 44) },
    textAlign: 'flex-start' as const,
    display: 64,
    body: 30,
  };
}

function Picture({ src, video, trim = 0, scene, drift = 1 }: { src: string; video?: boolean; trim?: number; scene: readonly [number, number]; drift?: number }) {
  const frame = useCurrentFrame();
  const [a, b] = scene;
  const t = interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // A slow push and a little lateral drift, inside the frame.
  const scale = 1.02 + 0.06 * t;
  const x = (t - 0.5) * 2.2 * drift;
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translateX(${x}%) scale(${scale})`,
  };
  return video ? (
    <Sequence from={a} durationInFrames={b - a} layout="none">
      <OffthreadVideo src={staticFile(src)} trimBefore={trim} muted style={style} />
    </Sequence>
  ) : (
    <Img src={staticFile(src)} style={style} />
  );
}

function Scene({ scene, ratio, pic, children }: { scene: readonly [number, number]; ratio: Ratio; pic?: ReactNode; children: ReactNode }) {
  const frame = useCurrentFrame();
  const L = layout(ratio);
  const o = fadeWindow(frame, scene[0], scene[1] - 1, 18);
  if (o === 0) return null;
  const textBox: CSSProperties = pic
    ? { position: 'absolute', ...L.text, display: 'flex', flexDirection: 'column', justifyContent: L.textAlign, gap: 22 }
    : { position: 'absolute', ...safeRect(ratio), left: safeRect(ratio).x, top: safeRect(ratio).y, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {pic ? (
        <div style={{ position: 'absolute', ...L.pic, overflow: 'hidden', backgroundColor: color.ink }}>{pic}</div>
      ) : null}
      <div style={textBox}>{children}</div>
    </AbsoluteFill>
  );
}

function Line({ children, size, serif = true, tone = color.ink, delay = 0, scene, style }: { children: ReactNode; size: number; serif?: boolean; tone?: string; delay?: number; scene: readonly [number, number]; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const o = progress(frame, scene[0] + 10 + delay, scene[0] + 34 + delay);
  return (
    <div
      style={{
        opacity: o,
        color: tone,
        fontFamily: serif ? FONTS.display : FONTS.body,
        fontSize: size,
        lineHeight: serif ? 1.06 : 1.45,
        letterSpacing: serif ? '-0.01em' : '0.01em',
        textWrap: 'balance',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Body({ ratio }: ReelProps) {
  const frame = useCurrentFrame();
  const L = layout(ratio);
  const safe = safeRect(ratio);
  const big = ratio === '16x9' ? 96 : 88;
  const small = L.body;
  const mute = color.stoneText;

  // The opening line: flat, then one heartbeat as the first words land.
  const lineW = safe.width * (ratio === '16x9' ? 0.62 : 1);
  const beat = progress(frame, 30, 75) * 0.25;
  const openFade = fadeWindow(frame, 0, S.open[1] - 1, 18);

  return (
    <AbsoluteFill style={{ backgroundColor: color.bone }}>
      {/* 1 · the biggest signature */}
      <Scene scene={S.open} ratio={ratio}>
        <div style={{ opacity: openFade }}>
          <PulseLine width={lineW} height={lineW * 0.12} baseline={lineW * 0.14} progress={beat} time={frame / FPS}
            color={color.bronze} strokeWidth={3} draw={progress(frame, 0, 40)} />
        </div>
        <Line scene={S.open} size={big} delay={20}>{HERO.open}</Line>
      </Scene>

      {/* 2 · everyone is paid when you sign; we're not */}
      <Scene scene={S.problem} ratio={ratio}>
        <Line scene={S.problem} size={big}>{HERO.problem}</Line>
        <Line scene={S.problem} size={big} tone={color.bronze} delay={60}>{HERO.turn}</Line>
      </Scene>

      {/* 3 · the clinic, at dusk */}
      <Scene scene={S.name} ratio={ratio} pic={<Picture src="renders/shophouse-street.jpg" scene={S.name} />}>
        <Line scene={S.name} size={L.display}>{HERO.name}</Line>
        <Line scene={S.name} size={small} serif={false} tone={mute} delay={24}>{HERO.nameSub}</Line>
      </Scene>

      {/* 4 · the welcome */}
      <Scene scene={S.welcome} ratio={ratio} pic={<Picture src="renders/shophouse-entrance.jpg" scene={S.welcome} drift={-1} />}>
        <Line scene={S.welcome} size={L.display}>{HERO.welcome}</Line>
      </Scene>

      {/* 5 · a published fee */}
      <Scene scene={S.fee} ratio={ratio}>
        <Line scene={S.fee} size={ratio === '16x9' ? 80 : 76}>{HERO.feeTitle}</Line>
        <div style={{ display: 'flex', flexDirection: 'column', gap: ratio === '16x9' ? 10 : 14, maxWidth: ratio === '16x9' ? 900 : undefined }}>
          {feeRows.map((r, i) => (
            <Line key={r.label} scene={S.fee} size={ratio === '16x9' ? 34 : 36} serif={false} delay={22 + i * 8}
              style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${color.travertine}`, paddingBottom: 8, fontFamily: FONTS.mono }}>
              <span style={{ color: mute }}>{r.label}</span>
              <span style={{ color: color.ink }}>{r.fee}</span>
            </Line>
          ))}
        </div>
        <Line scene={S.fee} size={small} serif={false} tone={mute} delay={70}>{HERO.feeNote} {HERO.feeRules}</Line>
      </Scene>

      {/* 6 · the consult */}
      <Scene scene={S.consult} ratio={ratio} pic={<Picture src="renders/shophouse-consult.jpg" scene={S.consult} />}>
        <Line scene={S.consult} size={L.display}>{HERO.consult}</Line>
        <Line scene={S.consult} size={small} serif={false} tone={mute} delay={24}>{HERO.consultSub}</Line>
      </Scene>

      {/* 7 · the Lounge */}
      <Scene scene={S.lounge} ratio={ratio} pic={<Picture src="renders/shophouse-lounge.jpg" scene={S.lounge} drift={-1} />}>
        <Line scene={S.lounge} size={L.display}>{HERO.lounge}</Line>
        <Line scene={S.lounge} size={small} serif={false} tone={mute} delay={24}>{HERO.loungeSub}</Line>
      </Scene>

      {/* 8 · the promise, over the service flow drawing itself */}
      <Scene scene={S.promise} ratio={ratio}
        pic={<Picture src="renders/layout-flow.mp4" video trim={Math.round(14.5 * FPS)} scene={S.promise} drift={0.3} />}>
        <Line scene={S.promise} size={L.display + 8}>{HERO.promise}</Line>
        <Line scene={S.promise} size={small} serif={false} tone={mute} delay={24}>{HERO.promiseSub}</Line>
      </Scene>

      {/* 9 · the ask */}
      <Scene scene={S.cta} ratio={ratio}>
        <Line scene={S.cta} size={big}>{HERO.cta}</Line>
        <Line scene={S.cta} size={small + 6} serif={false} tone={color.bronze} delay={20}>{HERO.ctaSub}</Line>
        <Line scene={S.cta} size={Math.round(small * 0.72)} serif={false} tone={mute} delay={40} style={{ marginTop: 24 }}>{HERO.legal}</Line>
      </Scene>
    </AbsoluteFill>
  );
}

export function HeroPromo(props: ReelProps) {
  return (
    <ReelFrame
      {...props}
      lang="en"
      bodyFrames={heroPromoFrames}
      text={Object.values(HERO).join(' ') + feeRows.map((r) => r.label + r.fee).join('')}
      body={<Body {...props} />}
    />
  );
}
