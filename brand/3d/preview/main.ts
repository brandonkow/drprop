/**
 * Loads every exported brand model (../*.glb) into its own small studio view.
 * Run: npm run 3d:preview -w @drprop/brand
 */
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODELS: [file: string, label: string, view: [number, number, number]][] = [
  ['pulse-roof', '3D-1 Pulse Roof', [0.25, 0.35, 1]],
  ['clay-terrace', '3D-2 Terrace', [0.9, 0.55, 1]],
  ['clay-condo', '3D-2 Condo', [0.9, 0.5, 1]],
  ['clay-bungalow', '3D-2 Bungalow', [0.9, 0.6, 1]],
  ['apothecary', '3D-4 Apothecary', [0.45, 0.2, 1]],
  ['member-card', '3D-5 Member card', [0.3, -0.15, 1]],
];

const grid = document.getElementById('grid')!;
const loader = new GLTFLoader();

for (const [file, label, dir] of MODELS) {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(canvas, cap);
  grid.append(fig);

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  scene.background = new Color('#F4F1EA');
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new HemisphereLight('#ffffff', '#D9CFBF', 0.6));
  const key = new DirectionalLight('#fff4e6', 1.4);
  key.position.set(-2, 3, 2);
  scene.add(key);

  const gltf = await loader.loadAsync(new URL(`../${file}.glb`, import.meta.url).href);
  scene.add(gltf.scene);
  const box = new Box3().setFromObject(gltf.scene);
  const size = box.getSize(new Vector3()).length();
  const center = box.getCenter(new Vector3());
  const camera = new PerspectiveCamera(30, 4 / 3, size / 100, size * 10);
  camera.position.copy(center).add(new Vector3(...dir).normalize().multiplyScalar(size * 1.9));
  camera.lookAt(center);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(canvas);
}
document.body.dataset.ready = 'true';
