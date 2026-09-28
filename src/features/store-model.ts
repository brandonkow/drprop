import { AmbientLight, Box3, Color, DirectionalLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tokens } from '../../brand/tokens.ts';

/** Render the shared GLB once, then release GPU resources. The poster stays on any failure. */
export async function renderStoreModel(container: HTMLElement, url: string) {
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: true, powerPreference: 'low-power' });
  if (!context) return;
  const renderer = new WebGLRenderer({ canvas, context, antialias: true });
  const scene = new Scene(); scene.background = new Color(tokens.bone);
  let model: Awaited<ReturnType<GLTFLoader['loadAsync']>> | undefined;
  try {
    model = await new GLTFLoader().loadAsync(url);
    if (document.hidden) return;
    const bounds = new Box3().setFromObject(model.scene), size = bounds.getSize(new Vector3());
    model.scene.position.sub(bounds.getCenter(new Vector3())); scene.add(model.scene);
    scene.add(new AmbientLight(0xffffff, 1.5));
    const light = new DirectionalLight(0xfff0d9, 3); light.position.set(-5, 9, 5); scene.add(light);
    const width = Math.min(900, Math.round(container.clientWidth * Math.min(devicePixelRatio || 1, 1.5)));
    const height = Math.round(width * .8);
    renderer.setSize(width, height, false);
    const camera = new PerspectiveCamera(40, width / height, .1, 100);
    const distance = Math.max(size.x, size.y, size.z) * 1.25;
    camera.position.set(distance * .6, distance * .65, distance); camera.lookAt(0, 0, 0);
    await renderer.compileAsync(scene, camera); renderer.render(scene, camera);
    if (context.isContextLost()) return;
    const rendered = new Image(); rendered.alt = 'Unconfirmed Dr Prop spatial concept rendered from the shared 3D model; not an actual store.';
    rendered.src = canvas.toDataURL('image/png');
    await rendered.decode();
    if (!document.hidden) { container.replaceChildren(rendered); container.dataset.model = 'rendered'; }
  } catch { container.dataset.model = 'poster'; }
  finally {
    model?.scene.traverse(item => { if (item instanceof Mesh) { item.geometry.dispose(); const materials = Array.isArray(item.material) ? item.material : [item.material]; for (const material of materials) material.dispose(); } });
    renderer.dispose(); renderer.forceContextLoss();
  }
}
