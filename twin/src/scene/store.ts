/**
 * The store model: the glb exported by blender/export_twin.py, dressed for an
 * isometric view. Walls that face the camera drop to a low cutaway (with dark
 * section caps, like the plan drawings); the street or concourse is cut to a model
 * base; each zone can be lit up when selected.
 */
import {
  BackSide,
  BoxGeometry,
  Box3,
  Color,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PlanData, ZoneKey } from '../data.ts';

export type WallMode = 'cut' | 'up' | 'down';

const INK = '#1C1B19';
const CUT_LOW = 0.55;
const CUT_DOWN = 0.18;
const FULL = 2.6;

interface Wall {
  mesh: Mesh;
  plane: Plane;
  height: number;
  side: 'front' | 'back' | 'west' | 'east' | 'inside';
}

/** Flat colours from the export, tuned for daylight in an isometric model. */
const TUNE: Record<string, Partial<{ color: string; roughness: number; metalness: number; emissive: string; emissiveIntensity: number }>> = {
  ground: { color: '#E9E4DA', roughness: 1 },
  asphalt: { color: '#8F8C86', roughness: 0.95 },
  pavers: { color: '#CBBFAE', roughness: 0.9 },
  'mall-floor': { color: '#E6E1D8', roughness: 0.35 },
  'travertine-floor': { roughness: 0.55 },
  walnut: { roughness: 0.5 },
  limewash: { color: '#EEE8DE', roughness: 0.95 },
  'limewash-warm': { color: '#E7DDCE', roughness: 0.95 },
  shutter: { color: '#B9B4AA', roughness: 0.6, metalness: 0.3 },
  screen: { color: '#141412', roughness: 0.2 },
};

export class Store {
  readonly root = new Group();
  readonly zones = new Map<ZoneKey, { meshes: Mesh[]; materials: MeshStandardMaterial[] }>();
  private readonly walls: Wall[] = [];
  private mode: WallMode = 'cut';
  private highlight: { zone: ZoneKey | null; strength: number } = { zone: null, strength: 0 };
  readonly bounds = new Box3();
  readonly island: [number, number, number, number];

  private constructor(readonly plan: PlanData) {
    const { width: W, depth: D } = plan;
    this.island = [-6.5, -12.4, W + 6.5, D + 3.2];
  }

  static async load(plan: PlanData, url: string): Promise<Store> {
    const s = new Store(plan);
    const gltf = await new GLTFLoader().loadAsync(url);
    s.prepare(gltf.scene);
    return s;
  }

  private prepare(model: Object3D) {
    const { width: W, depth: D } = this.plan;
    const [ix0, iy0, ix1, iy1] = this.island;
    // The model base: everything outside it is cut away, like a cardboard site model.
    const edges = [
      new Plane(new Vector3(1, 0, 0), -ix0),
      new Plane(new Vector3(-1, 0, 0), ix1),
      new Plane(new Vector3(0, 0, -1), -iy0), // three z = -y: keeps y ≥ iy0
      new Plane(new Vector3(0, 0, 1), iy1),
    ];
    const shared = new Map<Material, MeshStandardMaterial>();
    const meshes: Mesh[] = [];
    model.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });
    model.updateMatrixWorld(true);
    for (const mesh of meshes) {
      const data = { ...(mesh.userData ?? {}), ...(mesh.parent?.userData ?? {}) };
      const zone = (mesh.userData.zone ?? data.zone ?? 'shell') as string;
      if (mesh.name === 'ground' || mesh.parent?.name === 'ground') {
        mesh.visible = false;
        continue;
      }
      const src = mesh.material as MeshStandardMaterial;
      let mat = shared.get(src);
      if (!mat) {
        mat = src.clone();
        tune(mat);
        shared.set(src, mat);
      }
      const box = new Box3().setFromObject(mesh);
      const context = zone === 'context';
      const cut = !!(mesh.userData.cut ?? data.cut);
      const glass = mat.transparent;
      // Per-object materials where they need their own clipping or highlight.
      let own: MeshStandardMaterial = mat;
      if (cut || context || isZone(zone)) own = mat.clone();
      mesh.material = own;
      mesh.castShadow = !glass && box.max.y - box.min.y > 0.02;
      mesh.receiveShadow = true;
      const planes: Plane[] = context ? [...edges] : [];
      if (cut) {
        const plane = new Plane(new Vector3(0, -1, 0), FULL);
        planes.push(plane);
        const cx = (box.min.x + box.max.x) / 2;
        const cy = -(box.min.z + box.max.z) / 2;
        const axis = (mesh.userData.axis ?? data.axis) as string;
        let side: Wall['side'] = 'inside';
        if (axis === 'y') side = cy < 0.4 ? 'front' : cy > D - 0.4 ? 'back' : 'inside';
        else side = cx < 0.4 ? 'west' : cx > W - 0.4 ? 'east' : 'inside';
        this.walls.push({ mesh, plane, height: FULL, side });
        if (!glass) {
          const cap = new Mesh(mesh.geometry, new MeshBasicMaterial({ color: INK, side: BackSide, clippingPlanes: planes }));
          cap.raycast = () => {};
          mesh.add(cap);
        }
      }
      if (planes.length) {
        own.clippingPlanes = planes;
        own.clipShadows = true;
      }
      if (isZone(zone)) {
        const entry = this.zones.get(zone) ?? { meshes: [], materials: [] };
        entry.meshes.push(mesh);
        entry.materials.push(own);
        this.zones.set(zone, entry);
        mesh.userData.zone = zone;
      }
    }
    // A base under the model, with its cut edge in ink.
    const base = new Mesh(
      new BoxGeometry(ix1 - ix0, 0.5, iy1 - iy0),
      [side('#D9CFBF'), side('#D9CFBF'), side('#E9E4DA'), side('#C9BEAD'), side('#D9CFBF'), side('#D9CFBF')],
    );
    // Its top meets the lowest street surface: the road (shophouse) or the concourse (mall).
    const top = this.plan.setting === 'mall' ? -0.04 : -0.23;
    base.position.set((ix0 + ix1) / 2, top - 0.25, -(iy0 + iy1) / 2);
    base.receiveShadow = true;
    base.raycast = () => {};
    this.root.add(model, base);
    this.bounds.setFromObject(this.root);
  }

  setWalls(mode: WallMode) {
    this.mode = mode;
  }

  get wallMode(): WallMode {
    return this.mode;
  }

  setHighlight(zone: ZoneKey | null) {
    if (zone !== this.highlight.zone) this.highlight = { zone, strength: 0 };
  }

  /** Per frame: ease each wall to its height for the camera's side, ease the highlight. */
  update(dt: number, cameraDir: Vector3) {
    const k = 1 - Math.exp(-dt * 7);
    const fromFront = cameraDir.z > 0.05;
    const fromBack = cameraDir.z < -0.05;
    const fromWest = cameraDir.x < -0.05;
    const fromEast = cameraDir.x > 0.05;
    for (const w of this.walls) {
      let target = FULL;
      if (this.mode === 'down') target = CUT_DOWN;
      else if (this.mode === 'cut') {
        const facing =
          w.side === 'inside' ||
          (w.side === 'front' && fromFront) ||
          (w.side === 'back' && fromBack) ||
          (w.side === 'west' && fromWest) ||
          (w.side === 'east' && fromEast);
        if (facing) target = CUT_LOW;
      }
      w.height += (target - w.height) * k;
      w.plane.constant = w.height;
    }
    this.highlight.strength += (1 - this.highlight.strength) * k;
    for (const [key, entry] of this.zones) {
      const on = key === this.highlight.zone ? this.highlight.strength : 0;
      for (const m of entry.materials) {
        if (m.userData.glow) continue;
        m.emissive.set('#8C6A43');
        m.emissiveIntensity = on * 0.22;
      }
    }
  }
}

function isZone(z: string): z is ZoneKey {
  return ['reception', 'brief', 'lounge', 'apothecary', 'pantry', 'booth', 'consult_a', 'consult_b'].includes(z);
}

function side(color: string) {
  return new MeshStandardMaterial({ color, roughness: 1 });
}

function tune(m: MeshStandardMaterial) {
  const name = m.name.toLowerCase();
  m.envMapIntensity = 0.7;
  const key = Object.keys(TUNE).find((k) => name === k || name.startsWith(`${k}-`) || name.startsWith(k));
  const t = key ? TUNE[key] : undefined;
  if (t?.color) m.color.set(t.color);
  if (t?.roughness !== undefined) m.roughness = t.roughness;
  if (t?.metalness !== undefined) m.metalness = t.metalness;
  if (name.startsWith('glass')) {
    m.transparent = true;
    m.opacity = name === 'glass' ? 0.16 : 0.42;
    m.depthWrite = false;
    m.roughness = 0.05;
    m.color.set(name === 'glass' ? '#E8EEEE' : '#EFEDE6');
  }
  if (/^(led|washi|halo|screen-line|call-glow|tenant-glow)/.test(name)) {
    m.emissive = new Color(m.color);
    m.userData.glow = name.startsWith('tenant-glow') ? 0.25 : 0.9;
    m.emissiveIntensity = m.userData.glow;
  }
  if (name.includes('bronze') || name.includes('brass')) {
    m.metalness = 0.85;
    m.roughness = 0.38;
  }
}
