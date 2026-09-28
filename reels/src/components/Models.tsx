/**
 * R3F wrappers around the brand 3D builders (brand/3d), so reels, web and
 * Blender share one set of models (brief §9.1).
 *   PulseRoof3D   3D-1, with the bronze line re-extruded every frame so it can
 *                 beat and fold into the roof
 *   ClayHouse3D   3D-2, highlighted part pulses in bronze
 *   Apothecary3D  3D-4, one drawer slides out
 *   MemberCard3D  3D-5
 *   Store3D       3D-3 from brand/3d/store.glb, procedural stand-in if missing
 */
import {
  buildApothecary,
  buildClayHouse,
  buildMemberCard,
  materials,
  strokeShape,
  type HousePart,
  type HouseType,
} from '@drprop/brand/3d';
import { pulseAt, pulseGeometry } from '@drprop/brand/pulse/forms';
import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { BoxGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Vector2, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ------------------------------------------------------------------ 3D-1 */

const LINE_W = 0.6;
const LINE_H = 0.2;

export function PulseRoof3D({ progress, time }: { progress: number; time: number }) {
  const mats = useMemo(() => materials(), []);
  const geo = useMemo(() => pulseGeometry(220, { apex: 0.5, halfSpan: 0.14, dip: 0.14 }, 'wide'), []);
  const lineGeometry = useMemo(() => {
    const pts = pulseAt(geo, progress, time, 1080);
    const v: Vector2[] = [];
    for (let i = 0; i < geo.count; i++) v.push(new Vector2((pts[i * 2]! - 0.5) * LINE_W, pts[i * 2 + 1]! * LINE_H));
    const g = new ExtrudeGeometry(strokeShape(v, 0.008), {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.0008,
      bevelSize: 0.0006,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.translate(0, 0, -0.007);
    return g;
  }, [geo, progress, time]);
  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  return (
    <group>
      <mesh geometry={lineGeometry} material={mats.bronze} position={[0, 0.14 * LINE_H + 0.008, 0]} />
      <mesh material={mats.travertine} position={[0, -0.03, 0]}>
        <boxGeometry args={[LINE_W * 1.18, 0.06, 0.16]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ 3D-2 */

export function ClayHouse3D({
  type,
  highlight,
  pulse,
  rotationY = 0,
}: {
  type: HouseType;
  highlight?: HousePart;
  /** 0–1 strength of the bronze highlight this frame. */
  pulse: number;
  rotationY?: number;
}) {
  const house = useMemo(() => buildClayHouse({ type, highlight }), [type, highlight]);
  house.traverse((o) => {
    if (o instanceof Mesh && (o.material as MeshStandardMaterial).name === 'highlight') {
      (o.material as MeshStandardMaterial).emissiveIntensity = 0.15 + 0.85 * pulse;
    }
  });
  return <primitive object={house} rotation={[0, rotationY, 0]} />;
}

/* ------------------------------------------------------------------ 3D-4 */

export function Apothecary3D({ open, drawer = 'drawer-1-1' }: { open: number; drawer?: string }) {
  const cabinet = useMemo(() => buildApothecary(), []);
  const d = cabinet.getObjectByName(drawer);
  if (d) d.position.z = open * 0.28;
  return <primitive object={cabinet} />;
}

/* ------------------------------------------------------------------ 3D-5 */

export function MemberCard3D({ memberNo, rotationY, rotationX = 0 }: { memberNo: string; rotationY: number; rotationX?: number }) {
  const card = useMemo(() => buildMemberCard({ memberNo }), [memberNo]);
  return <primitive object={card} rotation={[rotationX, rotationY, 0]} />;
}

/* ------------------------------------------------------------------ 3D-3 */

/** Stand-in store when brand/3d/store.glb is missing: walls, floor, the cabinet. */
function proceduralStore(): Group {
  const m = materials();
  const g = new Group();
  g.name = 'store-placeholder';
  const W = 12.5;
  const D = 8;
  const H = 3.2;
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, mat: MeshStandardMaterial) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  add(W, 0.05, D, W / 2, -0.025, -D / 2, m.travertine);
  add(W, H, 0.15, W / 2, H / 2, -D, m.clay);
  add(0.15, H, D, 0, H / 2, -D / 2, m.clay);
  add(0.15, H, D, W, H / 2, -D / 2, m.clay);
  add(2.4, 0.05, 0.8, 4.2, 0.75, -1.6, m.walnut);
  const cab = buildApothecary();
  cab.position.set(W - 0.02, 0, -3.9);
  cab.rotation.y = -Math.PI / 2;
  g.add(cab);
  return g;
}

export function Store3D() {
  const [scene, setScene] = useState<Object3D | null>(null);
  const [handle] = useState(() => delayRender('store.glb'));
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    new GLTFLoader()
      .loadAsync(staticFile('3d/store.glb'))
      .then((gltf) => {
        gltf.scene.traverse((o) => {
          // Punctual lights exported from Blender are too hot for this stage.
          if ((o as { isLight?: boolean }).isLight) o.visible = false;
        });
        setScene(gltf.scene);
      })
      .catch(() => setScene(proceduralStore()));
  }, []);
  // Release the frame only once the loaded model has actually been drawn.
  useLayoutEffect(() => {
    if (!scene) return;
    advance(performance.now());
    continueRender(handle);
  }, [scene, advance, handle]);
  if (!scene) return null;
  return <primitive object={scene} />;
}
