/**
 * Shared 3D stage for the reels: ThreeCanvas sized to the video, a soft studio
 * environment (RoomEnvironment → PMREM, no network), one warm key light, and a
 * camera set from props every frame (slow pushes and orbits only, §9.6).
 */
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect, type ReactNode } from 'react';
import { Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { PMREMGenerator, Vector3, type PerspectiveCamera } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type V3 = [number, number, number];

function StudioEnvironment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

function CameraRig({ position, target, fov, centerY }: { position: V3; target: V3; fov: number; centerY: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { width, height } = useVideoConfig();
  const [px, py, pz] = position;
  const [tx, ty, tz] = target;
  useLayoutEffect(() => {
    // Set the aspect from the video size ourselves: the canvas may not have been
    // measured yet when the first frame is captured.
    camera.aspect = width / height;
    camera.position.set(px, py, pz);
    camera.fov = fov;
    camera.lookAt(new Vector3(tx, ty, tz));
    // Shift the image so the look-at point lands on `centerY` (the middle of the
    // platform safe area) instead of the middle of the frame.
    camera.setViewOffset(width, height, 0, (0.5 - centerY) * height, width, height);
    camera.updateProjectionMatrix();
  }, [camera, px, py, pz, tx, ty, tz, fov, width, height, centerY]);
  return null;
}

export interface Stage3DProps {
  children: ReactNode;
  background: string;
  camera: { position: V3; target: V3; fov?: number; near?: number; far?: number };
  environment?: number;
  keyLight?: { position: V3; intensity: number; color?: string };
  /** Where the look-at point sits vertically, 0 top – 1 bottom. Default: centre. */
  centerY?: number;
  /** Base URL of this stage already rendered ({frame}.png, see ReelProps.stageFrames): shown instead. */
  frames?: string;
}

/** The pre-rendered stage, frame for frame. The PNGs hold the same pixels the canvas would draw. */
function StageFrames({ src }: { src: string }) {
  const frame = useCurrentFrame();
  return <Img src={`${src}/${frame}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

export function Stage3D({ children, background, camera, environment = 0.9, keyLight, centerY = 0.5, frames }: Stage3DProps) {
  const { width, height } = useVideoConfig();
  if (frames) return <StageFrames src={frames} />;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{
        fov: camera.fov ?? 30,
        near: camera.near ?? 0.01,
        far: camera.far ?? 500,
        position: camera.position,
        aspect: width / height,
        manual: true,
      }}
    >
      <color attach="background" args={[background]} />
      <StudioEnvironment intensity={environment} />
      <hemisphereLight args={['#ffffff', '#D9CFBF', 0.5]} />
      {keyLight ? (
        <directionalLight position={keyLight.position} intensity={keyLight.intensity} color={keyLight.color ?? '#fff1de'} />
      ) : null}
      <CameraRig position={camera.position} target={camera.target} fov={camera.fov ?? 30} centerY={centerY} />
      {children}
    </ThreeCanvas>
  );
}
