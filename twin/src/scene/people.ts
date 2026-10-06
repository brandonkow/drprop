/**
 * The people: architect's-model figures jointed at hips, knees and shoulders, with the
 * same gait as the Blender film (driven by the distance walked), coloured by customer
 * type or staff role, with a ring on the floor in their colour.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
  Vector2,
} from 'three';
import type { Sample, Track } from '../sim/track.ts';

const HIP = 0.9;
const THIGH = 0.44;
const SHIN = 0.42;
const STRIDE = 1.35;
const DEG = Math.PI / 180;

const lathe = (pts: [number, number][], segs = 20) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), segs);

// Shared geometry (one set for everyone).
const G = {
  torso: lathe([[0, -0.04], [0.16, -0.04], [0.17, 0.06], [0.155, 0.22], [0.185, 0.4], [0.19, 0.48], [0.15, 0.55], [0.07, 0.58], [0.05, 0.6], [0.048, 0.65], [0, 0.65]], 24),
  head: new SphereGeometry(0.1, 20, 14),
  thigh: lathe([[0, 0.03], [0.082, 0], [0.075, -0.2], [0.06, -THIGH], [0, -THIGH - 0.03]], 12),
  shin: lathe([[0, 0.03], [0.062, 0], [0.056, -0.18], [0.044, -SHIN + 0.02], [0, -SHIN]], 12),
  foot: new BoxGeometry(0.095, 0.07, 0.25),
  arm: lathe([[0, 0.058], [0.025, 0.054], [0.045, 0.04], [0.056, 0.018], [0.058, 0], [0.048, -0.28], [0.038, -0.54], [0.02, -0.555], [0, -0.56]], 12),
  hand: lathe([[0, 0], [0.035, 0.02], [0.04, 0.07], [0.022, 0.1], [0, 0.105]], 10),
  ring: new RingGeometry(0.26, 0.3, 40),
  halo: new RingGeometry(0.34, 0.4, 48),
  cup: new CylinderGeometry(0.04, 0.032, 0.07, 16),
  towel: new CylinderGeometry(0.032, 0.032, 0.2, 12),
  brief: new BoxGeometry(0.21, 0.012, 0.3),
};

const skin = new MeshStandardMaterial({ color: '#E3D6C4', roughness: 0.6 });
const shoes = new MeshStandardMaterial({ color: '#2A2622', roughness: 0.45 });
const white = new MeshStandardMaterial({ color: '#F6F3EC', roughness: 0.7 });
const paper = new MeshStandardMaterial({ color: '#FBFAF7', roughness: 0.8 });

export interface Look {
  top: string;
  trousers: string;
  ring: string;
}

export class Figure {
  readonly root = new Group();
  private readonly hips = new Group();
  private readonly thigh: Record<'l' | 'r', Group> = { l: new Group(), r: new Group() };
  private readonly knee: Record<'l' | 'r', Group> = { l: new Group(), r: new Group() };
  private readonly arm: Record<'l' | 'r', Group> = { l: new Group(), r: new Group() };
  private readonly ring: Mesh;
  private readonly halo: Mesh;
  private readonly held: Record<string, Mesh>;
  private readonly materials: (MeshStandardMaterial | MeshBasicMaterial)[] = [];
  state: Sample | null = null;

  constructor(
    readonly key: string,
    readonly track: Track,
    look: Look,
  ) {
    const cloth = new MeshStandardMaterial({ color: look.top, roughness: 0.85 });
    const legs = new MeshStandardMaterial({ color: look.trousers, roughness: 0.8 });
    const ringMat = new MeshBasicMaterial({ color: look.ring, transparent: true, depthWrite: false });
    const haloMat = new MeshBasicMaterial({ color: '#8C6A43', transparent: true, depthWrite: false });
    this.materials.push(cloth, legs, ringMat, haloMat);
    const add = (parent: Object3D, geo: typeof G.torso | typeof G.head | typeof G.foot, mat: MeshStandardMaterial, at: [number, number, number] = [0, 0, 0]) => {
      const m = new Mesh(geo, mat);
      m.position.set(...at);
      m.castShadow = true;
      m.userData.person = key;
      parent.add(m);
      return m;
    };
    this.hips.position.y = HIP;
    this.root.add(this.hips);
    const torso = add(this.hips, G.torso, cloth);
    torso.scale.set(1, 1, 0.6);
    const head = add(this.hips, G.head, skin, [0, 0.74, -0.01]);
    head.scale.set(0.9, 1.15, 1);
    for (const [side, sx] of [['l', -1], ['r', 1]] as const) {
      const t = this.thigh[side];
      t.position.set(sx * 0.09, 0, 0);
      this.hips.add(t);
      add(t, G.thigh, legs);
      const k = this.knee[side];
      k.position.set(0, -THIGH, 0);
      t.add(k);
      add(k, G.shin, legs);
      add(k, G.foot, shoes as MeshStandardMaterial, [0, -SHIN - 0.03, -0.06]);
      const a = this.arm[side];
      a.position.set(sx * 0.215, 0.5, 0);
      this.hips.add(a);
      add(a, G.arm, cloth);
      add(a, G.hand, skin, [0, -0.64, 0]);
    }
    this.ring = new Mesh(G.ring, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.025;
    this.halo = new Mesh(G.halo, haloMat);
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.y = 0.026;
    this.halo.visible = false;
    this.root.add(this.ring, this.halo);
    // Things carried in the right hand.
    const hand = this.arm.r;
    this.held = {
      cup: new Mesh(G.cup, white),
      towel: new Mesh(G.towel, white),
      brief: new Mesh(G.brief, paper),
    };
    this.held.cup!.position.set(0, -0.66, -0.06);
    this.held.towel!.position.set(0, -0.67, -0.05);
    this.held.towel!.rotation.x = Math.PI / 2;
    this.held.brief!.position.set(0.02, -0.62, -0.04);
    this.held.brief!.rotation.x = Math.PI / 2;
    for (const m of Object.values(this.held)) {
      m.visible = false;
      m.castShadow = true;
      hand.add(m);
    }
    this.root.traverse((o) => (o.userData.person = key));
  }

  set selected(on: boolean) {
    this.halo.visible = on;
  }

  set dimmed(on: boolean) {
    for (const m of this.materials) {
      m.transparent = true;
      m.opacity = on ? 0.18 : 1;
    }
  }

  update(t: number) {
    const s = this.track.sample(t);
    this.state = s;
    if (!s || s.alpha <= 0.01) {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;
    this.root.position.set(s.x, 0, -s.y);
    this.root.rotation.y = s.yaw;
    const amp = s.walking ? 1 : 0;
    const phase = (s.dist / STRIDE) * 2 * Math.PI;
    const sw = Math.sin(phase);
    const sit = s.sit;
    for (const [side, sgn] of [['l', 1], ['r', -1]] as const) {
      this.thigh[side].rotation.x = sgn * 0.42 * amp * sw + sit * 88 * DEG;
      const swing = Math.max(0, sgn * Math.cos(phase));
      this.knee[side].rotation.x = -(0.75 * amp * swing + 0.08 * amp) - sit * 88 * DEG;
      this.arm[side].rotation.x = -sgn * 0.38 * amp * sw + sit * 0.55;
    }
    if (s.carrying) this.arm.r.rotation.x = 0.6;
    const bob = 0.018 * amp * Math.abs(Math.cos(phase));
    this.hips.position.y = HIP + bob - sit * (HIP - (s.seatH + 0.06));
    this.hips.position.z = 0.14 * sit;
    this.hips.rotation.set(-4 * DEG * sit, 0.06 * amp * sw, 0);
    for (const [k, m] of Object.entries(this.held)) m.visible = s.carrying === k;
    (this.ring.material as MeshBasicMaterial).opacity = 0.9 * s.alpha;
    this.root.scale.setScalar(0.85 + 0.15 * s.alpha);
  }

  dispose() {
    for (const m of this.materials) m.dispose();
  }
}
