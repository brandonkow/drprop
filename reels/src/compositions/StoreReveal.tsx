/**
 * R7 — store reveal (20 s): the camera walks in from the street, through the
 * Lounge, to a consult room door. Loads brand/3d/store.glb (built by
 * blender/build_store.py); renders a procedural stand-in if the file is missing.
 */
import { color } from '@drprop/brand/tokens';
import { interpolate, useCurrentFrame } from 'remotion';
import { COPY } from '../copy';
import { Caption } from '../components/Caption';
import { Store3D } from '../components/Models';
import { ease } from '../components/motion';
import { ReelFrame, type ReelProps } from '../components/ReelFrame';
import { SafeBox } from '../components/SafeBox';
import { Stage3D } from '../components/Stage3D';
import { FPS } from '../layout';

export const storeRevealFrames = 20 * FPS;

type V3 = [number, number, number];
// glTF coordinates (y up, the street at z = 0, the back wall at z = −8). Layout
// from blender/build_store.py: Lounge front-right, consult rooms back-right.
const KEYS: { f: number; pos: V3; look: V3 }[] = [
  { f: 0, pos: [3.0, 1.6, 7.0], look: [5.5, 1.9, -2] },
  { f: 5 * FPS, pos: [3.0, 1.55, 0.7], look: [7.5, 1.3, -3] },
  { f: 11 * FPS, pos: [7.0, 1.5, -1.2], look: [12.5, 1.0, -2.3] },
  { f: 16 * FPS, pos: [7.45, 1.5, -3.3], look: [7.7, 1.25, -6.4] },
  { f: 20 * FPS, pos: [7.6, 1.5, -4.2], look: [7.7, 1.2, -7.2] },
];

function at(frame: number, key: 'pos' | 'look'): V3 {
  const i = Math.max(0, KEYS.findIndex((k, j) => frame >= k.f && frame < (KEYS[j + 1]?.f ?? Infinity)));
  const a = KEYS[i]!;
  const b = KEYS[i + 1] ?? a;
  const t = b === a ? 0 : interpolate(frame, [a.f, b.f], [0, 1], { easing: ease, extrapolateRight: 'clamp' });
  return a[key].map((v, k) => v + (b[key][k]! - v) * t) as V3;
}

const LAMPS: V3[] = [
  [4.6, 2.3, -1.6],
  [9.3, 2.3, -1.9],
  [5.4, 2.3, -3.6],
  [7.7, 2.3, -6.4],
  [10.9, 2.3, -6.4],
];

function Body({ lang, ratio }: ReelProps) {
  const frame = useCurrentFrame();
  return (
    <>
      <Stage3D
        background="#E9E2D4"
        camera={{ position: at(frame, 'pos'), target: at(frame, 'look'), fov: 50, near: 0.05, far: 80 }}
        environment={0.55}
        keyLight={{ position: [6, 8, 10], intensity: 1.2, color: '#fff7ec' }}
      >
        {LAMPS.map((p) => (
          <pointLight key={p.join()} position={p} intensity={6} distance={9} decay={2} color="#ffc98f" />
        ))}
        <Store3D />
      </Stage3D>
      <SafeBox ratio={ratio} style={{ justifyContent: 'space-between' }}>
        <Caption lang={lang} ratio={ratio} role="display" from={12 * FPS} to={storeRevealFrames} color={color.ink}>
          {COPY.store.line[lang]}
        </Caption>
        <Caption lang={lang} ratio={ratio} from={14 * FPS} to={storeRevealFrames} color={color.ink}>
          {COPY.store.sub[lang]}
        </Caption>
      </SafeBox>
    </>
  );
}

export function StoreReveal(props: ReelProps) {
  return (
    <ReelFrame
      {...props}
      bodyFrames={storeRevealFrames}
      text={COPY.store.line[props.lang] + COPY.store.sub[props.lang]}
      body={<Body {...props} />}
    />
  );
}
