/**
 * Renderer, isometric camera, controls, light and post-processing. Plan coordinates
 * (Blender: x, y on the floor, z up) map to three.js as (x, z, -y).
 */
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  OrthographicCamera,
  PCFShadowMap,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

export const BONE = '#F4F1EA';

export function v3(x: number, y: number, z = 0): Vector3 {
  return new Vector3(x, z, -y);
}

export interface Frame {
  /** The part of the canvas not covered by panels, in CSS pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: OrthographicCamera;
  readonly controls: OrbitControls;
  readonly sun: DirectionalLight;
  private composer: EffectComposer | null = null;
  private ao: GTAOPass | null = null;
  private frame: Frame = { x: 0, y: 0, w: 1, h: 1 };
  /** Metres of plan visible across the shorter side of the free frame at zoom 1. */
  private span = 22;
  readonly target = new Vector3();
  quality: 'high' | 'low';

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.scene.background = new Color(BONE);

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.scene.add(new HemisphereLight('#FBFAF7', '#CDBFAA', 0.55));
    this.sun = new DirectionalLight('#FFEBD2', 3.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -20;
    sc.right = 20;
    sc.top = 20;
    sc.bottom = -20;
    sc.near = 1;
    sc.far = 90;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    this.camera.zoom = 1;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = 1.22;
    this.controls.minZoom = 0.6;
    this.controls.maxZoom = 6;
    this.controls.zoomToCursor = true;

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.quality = small ? 'low' : 'high';
    this.buildComposer();
  }

  private buildComposer() {
    this.composer?.dispose();
    this.composer = null;
    this.ao = null;
    if (this.quality !== 'high') return;
    const size = this.renderer.getDrawingBufferSize(new Vector2());
    const rt = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: 4 });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const ao = new GTAOPass(this.scene, this.camera, size.x, size.y);
    ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.ao = ao;
  }

  setQuality(q: 'high' | 'low') {
    if (q === this.quality) return;
    this.quality = q;
    this.buildComposer();
    this.resize();
  }

  /** Centre the store in the free frame (between the panels) and fit `span` metres. */
  setFrame(frame: Frame, span = this.span) {
    this.frame = frame;
    this.span = span;
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const f = this.frame;
    const unit = this.span / Math.max(1, Math.min(f.w, f.h)); // metres per CSS pixel at zoom 1
    this.camera.left = (-w / 2) * unit;
    this.camera.right = (w / 2) * unit;
    this.camera.top = (h / 2) * unit;
    this.camera.bottom = (-h / 2) * unit;
    // Shift the projection so the orbit target sits in the middle of the free frame.
    this.camera.setViewOffset(w, h, -(f.x + f.w / 2 - w / 2), -(f.y + f.h / 2 - h / 2), w, h);
    this.camera.updateProjectionMatrix();
    const size = this.renderer.getDrawingBufferSize(new Vector2());
    this.composer?.setSize(w, h);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.ao?.setSize(size.x, size.y);
  }

  /** Orbit to an azimuth (radians, 0 = from the street) and elevation, around `target`. */
  aim(target: Vector3, azimuth: number, polar: number, distance = 60) {
    this.target.copy(target);
    this.controls.target.copy(target);
    const p = new Vector3(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)).multiplyScalar(distance);
    this.camera.position.copy(target).add(p);
    this.camera.lookAt(target);
    this.controls.update();
  }

  /** Light from the front-left, high, like late morning in the street. */
  placeSun(centre: Vector3) {
    this.sun.position.copy(centre).add(new Vector3(-14, 26, 18));
    this.sun.target.position.copy(centre);
    this.sun.target.updateMatrixWorld();
  }

  render() {
    this.controls.update();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
