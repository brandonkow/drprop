/**
 * Product film (≈ 67 s, English): Dr Prop shown like a product launch.
 *
 * Studio plates (blender/build_promo.py) put every object in a dark void: the
 * store as a scale model that lights up and comes apart (with live callouts),
 * macros of the bronze sign, the materials and an apothecary drawer, the
 * booking flow on a phone, the member card. Between them, the place itself:
 * photoreal clips finished from the same renders (brand/renders/ai, concept
 * imagery). Type is set big and quiet: Instrument Serif for statements and
 * numbers, Geist for the line under them, Geist Mono for callouts.
 *
 * Plates are composited over --night with a lighten blend, so the studio void
 * becomes exactly the brand's night. Motion stays within brief §9.6: reveals
 * from a soft blur, slow pushes, fades, no whooshes or flashes.
 */
import { bands } from '@drprop/brand/pricing';
import { color } from '@drprop/brand/tokens';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, getStaticFiles, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import callouts from '../../../brand/renders/promo/model-callouts.json';
import { progress } from '../components/motion';
import { PulseLine } from '../components/PulseLine';
import { EndCard, type ReelProps } from '../components/ReelFrame';
import { Wordmark } from '../components/Wordmark';
import { FONTS, useFonts } from '../fonts';
import { FPS, FRAME, safeRect, type Ratio } from '../layout';

export const FILM = {
  open: 'The biggest signature of your life',
  open2: 'deserves a second opinion.',
  name: 'The independent property clinic.',
  bronze: 'Brushed bronze. Lit from behind.',
  materials: 'Travertine. Walnut. Linen.',
  drawer: 'An apothecary of kopi and kuih.',
  zero: '0%',
  zeroSub: 'commission. On anything. Ever.',
  fee: 'From RM',
  feeSub: 'Published. Capped. On our door.',
  welcome: 'A cold towel at the door.',
  lounge: 'Kopi, kuih and the market talk.',
  consult: 'Thirty minutes. A written diagnosis.',
  phone: 'Four screens to booked.',
  phoneSub: 'Deciding today? Video within two hours.',
  card: 'Membership.',
  cardSub: '300 places. One price for everyone.',
  golden: 'Drop in any time. No sales pitch.',
  place: 'Dr Prop · Petaling Jaya',
  cta: 'Before you sign, see the doctor.',
  legal: 'Concept imagery. Information and analysis, not legal, tax or financial advice.',
};

/** Callout labels for the exploded model, in two waves. */
const CALLOUTS: { key: keyof (typeof callouts.frames)[number]; label: string; wave: 0 | 1 }[] = [
  { key: 'reception', label: 'Reception · no counter', wave: 0 },
  { key: 'brief', label: 'Market brief', wave: 0 },
  { key: 'lounge', label: 'Lounge', wave: 0 },
  { key: 'apothecary', label: 'Apothecary wall', wave: 0 },
  { key: 'consult', label: 'Consult rooms', wave: 1 },
  { key: 'pantry', label: 'Pantry · kopi', wave: 1 },
  { key: 'booth', label: 'Urgent video booth', wave: 1 },
  { key: 'private', label: 'Private entrance', wave: 1 },
];

type Kind = 'plate' | 'clip' | 'slate' | 'end';
interface Scene {
  key: string;
  kind: Kind;
  dur: number;
  src?: string;
  trim?: number;
}

const SCENES: Scene[] = [
  { key: 'open', kind: 'slate', dur: 112 },
  { key: 'open2', kind: 'slate', dur: 64 },
  { key: 'name', kind: 'slate', dur: 84 },
  { key: 'model', kind: 'plate', dur: 390, src: 'renders/promo/model.mp4', trim: 6 },
  { key: 'bronze', kind: 'plate', dur: 90, src: 'renders/promo/bronze.mp4', trim: 4 },
  { key: 'materials', kind: 'plate', dur: 90, src: 'renders/promo/materials.mp4', trim: 4 },
  { key: 'drawer', kind: 'plate', dur: 92, src: 'renders/promo/drawer.mp4', trim: 4 },
  { key: 'zero', kind: 'slate', dur: 104 },
  { key: 'fee', kind: 'slate', dur: 106 },
  { key: 'welcome', kind: 'clip', dur: 112, src: 'renders/ai/clip-welcome.mp4', trim: 12 },
  { key: 'lounge', kind: 'clip', dur: 112, src: 'renders/ai/clip-lounge.mp4', trim: 18 },
  { key: 'consult', kind: 'clip', dur: 118, src: 'renders/ai/clip-consult.mp4', trim: 14 },
  { key: 'phone', kind: 'plate', dur: 140, src: 'renders/promo/phone.mp4', trim: 2 },
  { key: 'card', kind: 'plate', dur: 150, src: 'renders/promo/card.mp4', trim: 4 },
  { key: 'golden', kind: 'clip', dur: 112, src: 'renders/ai/clip-golden.mp4', trim: 16 },
  { key: 'street', kind: 'clip', dur: 148, src: 'renders/ai/clip-street.mp4', trim: 0 },
];

const starts: Record<string, number> = {};
let cursor = 0;
for (const s of SCENES) {
  starts[s.key] = cursor;
  cursor += s.dur;
}
export const productFilmBody = cursor;
export const PRODUCT_FILM_END = 90;
export const productFilmFrames = productFilmBody + PRODUCT_FILM_END;

const NIGHT = color.night;
const LIGHT = color.nightText;

/** Where the film puts the 16:9 picture and the words, per format. */
function frameFor(ratio: Ratio) {
  const { width, height } = FRAME[ratio];
  const safe = safeRect(ratio);
  if (ratio === '16x9') {
    return { width, height, safe, pic: { left: 0, top: 0, width, height }, clip: { left: 0, top: 0, width, height }, scale: 1 };
  }
  // Tall formats: the plate as a band in the safe centre, the clips cropped tall.
  const picW = width;
  const picH = Math.round((width * 9) / 16);
  const picTop = Math.round(safe.y + safe.height * 0.42 - picH / 2);
  const clipH = Math.round(height * 0.64);
  return {
    width,
    height,
    safe,
    pic: { left: 0, top: picTop, width: picW, height: picH },
    clip: { left: 0, top: Math.round(safe.y - 80), width, height: clipH },
    scale: width / 1920,
  };
}

/** Apple-style reveal: from a soft blur and a little below, settling into place. */
function reveal(frame: number, at: number, out: number | null, len = 26) {
  const k = progress(frame, at, at + len);
  const o = out === null ? 1 : 1 - progress(frame, out, out + 16);
  return {
    opacity: k * o,
    filter: `blur(${(1 - k) * 14 + (1 - o) * 8}px)`,
    transform: `translateY(${(1 - k) * 26}px)`,
  } satisfies CSSProperties;
}

/** Fade a whole scene in and out (through night). */
function sceneFade(frame: number, dur: number, fadeIn = 8, fadeOut = 8) {
  return Math.min(progress(frame, 0, fadeIn), 1 - progress(frame, dur - fadeOut, dur));
}

function Text({ children, size, font = 'display', style }: { children: ReactNode; size: number; font?: 'display' | 'body' | 'mono'; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: FONTS[font],
        fontSize: size,
        lineHeight: font === 'display' ? 1.02 : 1.3,
        letterSpacing: font === 'display' ? '-0.012em' : font === 'mono' ? '0.08em' : '0',
        textTransform: font === 'mono' ? 'uppercase' : 'none',
        fontVariantNumeric: 'tabular-nums',
        color: LIGHT,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A plate from blender/build_promo.py, lightened over night. */
function Plate({ scene, ratio, children }: { scene: Scene; ratio: Ratio; children?: ReactNode }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: sceneFade(frame, scene.dur, 10, 10) }}>
      <div style={{ position: 'absolute', ...f.pic, mixBlendMode: 'lighten' }}>
        <OffthreadVideo src={staticFile(scene.src!)} trimBefore={scene.trim} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      {children}
    </AbsoluteFill>
  );
}

/** A photoreal clip from brand/renders/ai: full frame (16:9) or a tall crop, with a slow push. */
function Clip({ scene, ratio, children }: { scene: Scene; ratio: Ratio; children?: ReactNode }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const push = interpolate(frame, [0, scene.dur], [1.0, 1.035]);
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: sceneFade(frame, scene.dur, 9, 9) }}>
      <div style={{ position: 'absolute', ...f.clip, overflow: 'hidden' }}>
        <OffthreadVideo
          src={staticFile(scene.src!)}
          trimBefore={scene.trim}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})` }}
        />
      </div>
      {children}
    </AbsoluteFill>
  );
}

/** Words in the lower-left of a 16:9 picture, or under the picture in tall formats. */
function Caption({ ratio, top, sub, at = 14, out }: { ratio: Ratio; top: string; sub?: string; at?: number; out: number }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const shadow = '0 2px 28px rgba(20,20,18,0.55)';
  const box: CSSProperties = wide
    ? { position: 'absolute', left: f.safe.x, bottom: f.safe.y + 36, width: f.width * 0.6 }
    : { position: 'absolute', left: f.safe.x, top: f.clip.top + f.clip.height + 48, width: f.safe.width };
  return (
    <div style={box}>
      <Text size={wide ? 64 : 62} style={{ ...reveal(frame, at, out), textShadow: wide ? shadow : 'none' }}>
        {top}
      </Text>
      {sub ? (
        <Text size={wide ? 30 : 34} font="body" style={{ ...reveal(frame, at + 16, out), marginTop: 18, opacity: 0.86 * reveal(frame, at + 16, out).opacity, textShadow: wide ? shadow : 'none' }}>
          {sub}
        </Text>
      ) : null}
    </div>
  );
}

/** Words over a dark plate, set like a product line: big statement, quiet line under it. */
function PlateWords({
  ratio,
  top,
  sub,
  at = 18,
  out,
  align = 'left',
  ink = false,
}: {
  ratio: Ratio;
  top: string;
  sub?: string;
  at?: number;
  out: number;
  align?: 'left' | 'center';
  /** Dark type, for the bright macros (travertine, towels). */
  ink?: boolean;
}) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const box: CSSProperties = wide
    ? align === 'center'
      ? { position: 'absolute', left: 0, right: 0, bottom: f.safe.y + 40, textAlign: 'center' }
      : { position: 'absolute', left: f.safe.x, bottom: f.safe.y + 40, width: f.width * 0.5 }
    : { position: 'absolute', left: f.safe.x, top: f.pic.top + f.pic.height + 56, width: f.safe.width, textAlign: 'left' };
  return (
    <div style={box}>
      <Text size={wide ? 60 : 62} style={{ ...reveal(frame, at, out), color: ink && wide ? color.ink : LIGHT }}>
        {top}
      </Text>
      {sub ? (
        <Text size={wide ? 30 : 34} font="body" style={{ ...reveal(frame, at + 14, out), marginTop: 16, color: ink && wide ? color.stoneText : '#BDB8AE' }}>
          {sub}
        </Text>
      ) : null}
    </div>
  );
}

function Open({ ratio, second }: { ratio: Ratio; second?: boolean }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const lineW = Math.min(f.safe.width, wide ? 1100 : 900);
  const size = wide ? 92 : 84;
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT }}>
      {!second ? (
        <div style={{ position: 'absolute', left: (f.width - lineW) / 2, top: f.safe.y + f.safe.height * (wide ? 0.62 : 0.66), width: lineW, opacity: 1 - progress(frame, 96, 112) }}>
          <PulseLine width={lineW} height={lineW * 0.1} baseline={lineW * 0.12} progress={0.25} time={frame / FPS} color={LIGHT} strokeWidth={2} draw={progress(frame, 4, 70)} apex={0.5} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: f.safe.x, right: f.safe.x, top: f.safe.y + f.safe.height * (wide ? 0.34 : 0.36), textAlign: 'center' }}>
        {second ? (
          <Text size={size} style={reveal(frame, 4, 50, 22)}>
            {FILM.open2}
          </Text>
        ) : (
          <Text size={size} style={reveal(frame, 26, 96)}>
            {FILM.open}
          </Text>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Model({ scene, ratio }: { scene: Scene; ratio: Ratio }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const plateFrame = Math.min(callouts.frames.length - 1, frame + (scene.trim ?? 0));
  const row = callouts.frames[plateFrame]!;
  const waves = [
    [236, 312],
    [312, 384],
  ] as const;
  return (
    <Plate scene={scene} ratio={ratio}>
      {/* Callouts ride on the zones as the model comes apart. */}
      {CALLOUTS.map((c, i) => {
        const [a, b] = waves[c.wave];
        const at = a + (i % 4) * 7;
        const vis = reveal(frame, at, b, 18);
        const p = row[c.key];
        if (!p || vis.opacity <= 0.001) return null;
        const x = f.pic.left + p[0]! * f.pic.width;
        const y = f.pic.top + p[1]! * f.pic.height;
        const rise = (wide ? 92 : 70) + (i % 2) * 26;
        const size = wide ? 20 : 18;
        const tagW = c.label.length * size * 0.62 + 24;
        // The tag stays inside the safe area even when its zone is near the edge.
        const shift = Math.max(f.safe.x - (x - tagW / 2), Math.min(0, f.width - f.safe.x - (x + tagW / 2)));
        return (
          <div key={c.key} style={{ position: 'absolute', left: x, top: y - rise, opacity: vis.opacity, filter: vis.filter }}>
            <div style={{ position: 'absolute', left: -5, top: rise - 5, width: 10, height: 10, borderRadius: 5, background: '#B08B60', boxShadow: '0 0 0 2px rgba(20,20,18,0.8)' }} />
            <div style={{ position: 'absolute', left: 0, top: 30, width: 1.5, height: rise - 32, background: 'rgba(20,20,18,0.85)' }} />
            <div style={{ position: 'absolute', left: shift, top: 0, transform: 'translateX(-50%)', padding: '7px 12px 6px', borderRadius: 2, background: 'rgba(20,20,18,0.88)' }}>
              <Text size={size} font="mono" style={{ whiteSpace: 'nowrap' }}>
                {c.label}
              </Text>
            </div>
          </div>
        );
      })}
    </Plate>
  );
}

/** The name on night, before the product appears. */
function Name({ ratio, dur }: { ratio: Ratio; dur: number }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: 1 - progress(frame, dur - 14, dur) }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: f.safe.y + f.safe.height * (wide ? 0.36 : 0.38), textAlign: 'center' }}>
        <div style={{ display: 'inline-block', ...reveal(frame, 4, null, 30) }}>
          <Wordmark width={wide ? 520 : 600} color={LIGHT} />
        </div>
        <Text size={wide ? 40 : 42} font="body" style={{ ...reveal(frame, 22, null), marginTop: 30, color: '#BDB8AE' }}>
          {FILM.name}
        </Text>
      </div>
    </AbsoluteFill>
  );
}

function Zero({ ratio, dur }: { ratio: Ratio; dur: number }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: sceneFade(frame, dur, 6, 10) }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: f.safe.y + f.safe.height * (wide ? 0.16 : 0.2), textAlign: 'center' }}>
        <Text size={wide ? 300 : 280} style={{ ...reveal(frame, 6, null, 30), lineHeight: 1 }}>
          {FILM.zero}
        </Text>
        <Text size={wide ? 44 : 46} font="body" style={{ ...reveal(frame, 30, null), marginTop: 28, color: '#BDB8AE' }}>
          {FILM.zeroSub}
        </Text>
      </div>
    </AbsoluteFill>
  );
}

function Fee({ ratio, dur }: { ratio: Ratio; dur: number }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const first = bands[0]!.fee;
  const n = Math.round(interpolate(progress(frame, 10, 52), [0, 1], [0, first]));
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, opacity: sceneFade(frame, dur, 6, 10) }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: f.safe.y + f.safe.height * (wide ? 0.2 : 0.24), textAlign: 'center' }}>
        <Text size={wide ? 64 : 58} font="body" style={{ ...reveal(frame, 4, null, 20), color: '#BDB8AE' }}>
          {FILM.fee}
        </Text>
        <Text size={wide ? 250 : 230} style={{ ...reveal(frame, 8, null, 26), lineHeight: 1, marginTop: 6 }}>
          {n}
        </Text>
        <Text size={wide ? 40 : 42} font="body" style={{ ...reveal(frame, 46, null), marginTop: 30, color: '#BDB8AE' }}>
          {FILM.feeSub}
        </Text>
      </div>
    </AbsoluteFill>
  );
}

function Street({ scene, ratio }: { scene: Scene; ratio: Ratio }) {
  const frame = useCurrentFrame();
  const f = frameFor(ratio);
  const wide = ratio === '16x9';
  const shadow = '0 2px 30px rgba(20,20,18,0.6)';
  return (
    <Clip scene={scene} ratio={ratio}>
      <div
        style={
          wide
            ? { position: 'absolute', left: 0, right: 0, top: f.safe.y + 46, textAlign: 'center' } // on the dark upper wall
            : { position: 'absolute', left: f.safe.x, right: f.safe.x, top: f.clip.top + f.clip.height + 48, textAlign: 'center' }
        }
      >
        <Text size={wide ? 26 : 28} font="mono" style={{ ...reveal(frame, 12, null), textShadow: wide ? shadow : 'none' }}>
          {FILM.place}
        </Text>
        <Text size={wide ? 70 : 64} style={{ ...reveal(frame, 34, null, 30), marginTop: 18, textShadow: wide ? shadow : 'none' }}>
          {FILM.cta}
        </Text>
      </div>
    </Clip>
  );
}

function body(scene: Scene, ratio: Ratio): ReactNode {
  const out = scene.dur - 22;
  switch (scene.key) {
    case 'open':
      return <Open ratio={ratio} />;
    case 'open2':
      return <Open ratio={ratio} second />;
    case 'name':
      return <Name ratio={ratio} dur={scene.dur} />;
    case 'model':
      return <Model scene={scene} ratio={ratio} />;
    case 'bronze':
      return (
        <Plate scene={scene} ratio={ratio}>
          <PlateWords ratio={ratio} top={FILM.bronze} out={out} ink />
        </Plate>
      );
    case 'materials':
      return (
        <Plate scene={scene} ratio={ratio}>
          <PlateWords ratio={ratio} top={FILM.materials} out={out} />
        </Plate>
      );
    case 'drawer':
      return (
        <Plate scene={scene} ratio={ratio}>
          <PlateWords ratio={ratio} top={FILM.drawer} out={out} />
        </Plate>
      );
    case 'zero':
      return <Zero ratio={ratio} dur={scene.dur} />;
    case 'fee':
      return <Fee ratio={ratio} dur={scene.dur} />;
    case 'welcome':
      return (
        <Clip scene={scene} ratio={ratio}>
          <Caption ratio={ratio} top={FILM.welcome} out={out} />
        </Clip>
      );
    case 'lounge':
      return (
        <Clip scene={scene} ratio={ratio}>
          <Caption ratio={ratio} top={FILM.lounge} out={out} />
        </Clip>
      );
    case 'consult':
      return (
        <Clip scene={scene} ratio={ratio}>
          <Caption ratio={ratio} top={FILM.consult} out={out} />
        </Clip>
      );
    case 'phone':
      return (
        <Plate scene={scene} ratio={ratio}>
          <PlateWords ratio={ratio} top={FILM.phone} sub={FILM.phoneSub} out={out} />
        </Plate>
      );
    case 'card':
      return (
        <Plate scene={scene} ratio={ratio}>
          <PlateWords ratio={ratio} top={FILM.card} sub={FILM.cardSub} out={out} />
        </Plate>
      );
    case 'golden':
      return (
        <Clip scene={scene} ratio={ratio}>
          <Caption ratio={ratio} top={FILM.golden} out={out} />
        </Clip>
      );
    case 'street':
      return <Street scene={scene} ratio={ratio} />;
    default:
      return null;
  }
}

export function ProductFilm({ lang, ratio, showSafeZone }: ReelProps) {
  const text = Object.values(FILM).join(' ') + CALLOUTS.map((c) => c.label).join(' ') + ' 0123456789';
  useFonts(lang, text);
  const files = getStaticFiles().map((f) => f.name);
  const score = ['audio/promo-score.m4a', 'audio/promo-score.wav'].find((n) => files.includes(n));
  const { safe, width } = frameFor(ratio);
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, color: LIGHT }}>
      {SCENES.map((s) => (
        <Sequence key={s.key} from={starts[s.key]} durationInFrames={s.dur} name={s.key}>
          {body(s, ratio)}
        </Sequence>
      ))}
      <Sequence from={productFilmBody} durationInFrames={PRODUCT_FILM_END} name="end">
        <EndCard ratio={ratio} dark />
        <div style={{ position: 'absolute', left: safe.x, right: safe.x, bottom: safe.y + 8, textAlign: 'center', opacity: 0.6 }}>
          <Text size={ratio === '16x9' ? 18 : 22} font="body" style={{ color: '#8A857C' }}>
            {FILM.legal}
          </Text>
        </div>
      </Sequence>
      {score ? <Audio src={staticFile(score)} volume={(f) => interpolate(f, [0, 20, productFilmFrames - 40, productFilmFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} /> : null}
      {showSafeZone ? <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: width - safe.x * 2, height: safe.height, outline: '2px dashed rgba(255,0,0,0.5)' }} /> : null}
    </AbsoluteFill>
  );
}
