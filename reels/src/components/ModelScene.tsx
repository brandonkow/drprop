import React, { useEffect, useMemo, useState } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Box3, CanvasTexture, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useThree } from '@react-three/fiber';
import { apothecary, clayHouse, conceptStore, memberCard, pulseSculpture } from '../../../brand/three/models.mjs';
import { ensureFonts } from './Frame';

type ModelKind = 'pulse' | 'terrace' | 'condo' | 'bungalow' | 'apothecary' | 'member' | 'store';
const files: Record<ModelKind, string> = { pulse: 'pulse-roof', terrace: 'clay-terrace', condo: 'clay-condo', bungalow: 'clay-bungalow', apothecary: 'apothecary', member: 'member-card', store: 'store' };
function build(kind: ModelKind) { return kind === 'pulse' ? pulseSculpture() : kind === 'apothecary' ? apothecary() : kind === 'member' ? memberCard() : kind === 'store' ? conceptStore() : clayHouse(kind); }
function dispose(group: Group) { group.traverse((item: any) => { item.geometry?.dispose(); const materials = Array.isArray(item.material) ? item.material : [item.material]; materials.forEach((mat: any) => {mat?.map?.dispose();mat?.dispose();}); }); }
function Camera({ kind }: { kind: ModelKind }) {
  const { camera } = useThree(); const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig(); const p = frame / durationInFrames;
  if (kind === 'store') {
    const segment = p < .55 ? p/.55 : (p-.55)/.45;
    const ease = segment*segment*(3-2*segment);
    const from = p < .55 ? new Vector3(2.5,1.8,5.8) : new Vector3(.8,.25,1.2);
    const to = p < .55 ? new Vector3(.8,.25,1.2) : new Vector3(1.7,1.2,-.6);
    camera.position.copy(from.lerp(to,ease));
    camera.lookAt(p < .55 ? .25 : .25-.15*ease,-.22,p < .55 ? .25-.6*ease : -.35-.95*ease);
  } else { camera.position.set(.8,1.25,kind==='pulse'||kind==='apothecary'?5.8:kind==='member'?7:8); camera.lookAt(0,0,0); }
  camera.updateProjectionMatrix();
  return null;
}
export function ModelScene({ kind, width, height, fallback = false, highlight = 'none' }: { kind: ModelKind; width: number; height: number; fallback?: boolean; highlight?: string }) {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig();
  const initial = useMemo(() => ['terrace','condo','bungalow'].includes(kind) ? clayHouse(kind, highlight) : build(kind), [kind, highlight]); const [model, setModel] = useState<Group>(initial);
  const [handle] = useState(() => delayRender(`Loading ${kind} model`));
  useEffect(() => {
    let active = true; let loaded: Group | undefined;
    if (fallback || highlight !== 'none') { continueRender(handle); return; }
    new GLTFLoader().load(staticFile(`models/${files[kind]}.glb`), async gltf => {
      try {
      loaded = gltf.scene;
      if (kind === 'member') await ensureFonts();
      gltf.scene.traverse((item:any)=>{if(item.isMesh){item.castShadow=true;item.receiveShadow=kind!=='member';if(kind==='member'&&item.name.includes('Brushed')){item.material.color.set('#645F55');item.material.metalness=.4;item.material.roughness=.48;}}});
      if (kind === 'member') {
        const canvas = document.createElement('canvas');canvas.width=680;canvas.height=1080;const context=canvas.getContext('2d')!;
        context.fillStyle='#C2B9A6';context.font='36px Geist';context.fillText('DR. PROP',56,120);context.font='28px GeistMono';context.fillText('DEMO 0001',56,870);context.font='18px Geist';context.fillText('MEMBERSHIP PREVIEW',56,935);
        const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
        const label=new Mesh(new PlaneGeometry(1.7,2.7),new MeshStandardMaterial({map:texture,transparent:true,roughness:.65,metalness:.2,depthWrite:false}));label.position.set(0,1.35,.018);gltf.scene.add(label);
      }
      if (active) { setModel(gltf.scene); continueRender(handle); } else dispose(gltf.scene);
      } catch (error) { if (active) cancelRender(error); }
    }, undefined, () => { if (active) { console.warn(`Using procedural fallback for ${kind}`); continueRender(handle); } });
    return () => { active = false; if (loaded) dispose(loaded); };
  }, [kind, fallback, highlight, handle]);
  useEffect(() => () => dispose(initial), [initial]);
  const normalized = useMemo(() => { const bounds = new Box3().setFromObject(model); const size = bounds.getSize(new Vector3()); const centre = bounds.getCenter(new Vector3()); const scale=4/Math.max(size.x,size.y,size.z);return { scale, floor:-size.y*scale/2-.02, offset: centre.multiplyScalar(-1).toArray() as [number, number, number] }; }, [model]);
  return <ThreeCanvas shadows="percentage" width={width} height={height} style={{ width, height }} camera={{ fov: 40, position: [0.8, 1.5, 6.5] }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
    <ambientLight intensity={1.1} /><directionalLight castShadow shadow-mapSize={[1024,1024]} shadow-normalBias={.035} shadow-bias={-.0001} shadow-camera-near={.5} shadow-camera-far={20} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} position={[-4, 6, 4]} intensity={3} color="#FFF0D9" /><directionalLight position={[3, 2, -2]} intensity={.7} />
    <Camera kind={kind} />
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,normalized.floor,0]}><planeGeometry args={[30,30]}/><shadowMaterial transparent opacity={.16}/></mesh>
    <group scale={normalized.scale} rotation={[0, kind === 'member' ? -.2 + .4 * frame / durationInFrames : kind === 'store' ? -.2 : -.3 + .12 * frame / durationInFrames, 0]}><group position={normalized.offset}><primitive object={model} /></group></group>
  </ThreeCanvas>;
}
