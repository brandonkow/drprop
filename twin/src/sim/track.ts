/**
 * A person's day as a list of segments — walks along the network and stays (standing
 * or seated) — built step by step by the planner and sampled at any time by the scene.
 * Time is in simulated minutes from opening (0 = 10:00).
 */
import type { Network, Vec2, ZoneKey } from '../data.ts';
import { dist, Graph } from './graph.ts';

/** Walking pace, metres per simulated minute. */
export const SPEED = 2.6;
/** Time to sit down or stand up. */
export const SIT = 0.5;
const TURN = 0.35;

export type Place = { node: string } | { seat: string } | { spot: string };
export type Item = 'cup' | 'towel' | 'brief';

export interface Walk {
  kind: 'walk';
  t0: number;
  t1: number;
  pts: Vec2[];
  cum: number[];
  len: number;
  /** Distance walked before this segment (drives the gait phase). */
  d0: number;
  activity: string;
  zone: ZoneKey | null;
}

export interface Stay {
  kind: 'stay';
  t0: number;
  t1: number;
  xy: Vec2;
  yaw: number;
  yawIn: number;
  sit: boolean;
  h: number;
  activity: string;
  zone: ZoneKey | null;
  d0: number;
  rampOut: boolean;
}

export type Seg = Walk | Stay;

export interface Sample {
  x: number;
  y: number;
  yaw: number;
  /** 0 standing … 1 seated. */
  sit: number;
  seatH: number;
  /** Metres per simulated minute (0 when still). */
  speed: number;
  /** Distance walked so far today. */
  dist: number;
  walking: boolean;
  activity: string;
  zone: ZoneKey | null;
  /** 0–1: people fade in and out at the ends of the street. */
  alpha: number;
  carrying: Item | null;
}

export class Track {
  readonly segs: Seg[] = [];
  readonly carry: { t0: number; t1: number; item: Item }[] = [];
  t: number;
  xy: Vec2;
  node: string;
  seat: string | null = null;
  facing: number | null = null;
  yaw: number;
  walked = 0;
  /** Clients leave the scene at the end of their last walk. */
  vanish = false;

  constructor(
    private readonly g: Graph,
    private readonly net: Network,
    at: Place,
    t: number,
    yaw = 0,
  ) {
    this.t = t;
    this.yaw = yaw;
    const r = this.resolve(at);
    this.node = r.node;
    this.xy = r.xy;
    this.seat = 'seat' in at ? at.seat : null;
    this.facing = r.facing;
  }

  private resolve(p: Place): { node: string; xy: Vec2; facing: number | null; zone: ZoneKey | null } {
    if ('seat' in p) {
      const s = this.net.seats[p.seat];
      if (!s) throw new Error(`unknown seat "${p.seat}"`);
      return { node: s.via, xy: s.xy, facing: s.yaw, zone: s.zone };
    }
    if ('spot' in p) {
      const s = this.net.spots[p.spot];
      if (!s) throw new Error(`unknown spot "${p.spot}"`);
      return { node: s.node, xy: this.g.node(s.node), facing: s.yaw, zone: s.zone };
    }
    return { node: p.node, xy: this.g.node(p.node), facing: null, zone: null };
  }

  /** The route from where the person is to a place, as floor points. */
  route(to: Place): Vec2[] {
    const r = this.resolve(to);
    const pts: Vec2[] = [this.xy];
    if (this.seat) pts.push(this.g.node(this.node));
    for (const k of this.g.path(this.node, r.node)) pts.push(this.g.node(k));
    if ('seat' in to) pts.push(r.xy);
    return pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]!) > 1e-3);
  }

  /** Minutes to walk to a place from here. */
  travel(to: Place): number {
    const pts = this.route(to);
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1]!, pts[i]!);
    return s / SPEED;
  }

  go(to: Place, activity: string, zone: ZoneKey | null = null): this {
    const pts = this.route(to);
    const r = this.resolve(to);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
    const len = cum[cum.length - 1]!;
    const last = this.segs[this.segs.length - 1];
    if (len > 0.01) {
      if (last?.kind === 'stay' && last.sit) last.rampOut = true;
      const t1 = this.t + len / SPEED;
      this.segs.push({ kind: 'walk', t0: this.t, t1, pts, cum, len, d0: this.walked, activity, zone: zone ?? r.zone });
      const a = pts[pts.length - 2]!;
      const b = pts[pts.length - 1]!;
      this.yaw = heading(a, b);
      this.walked += len;
      this.t = t1;
    }
    this.xy = r.xy;
    this.node = r.node;
    this.seat = 'seat' in to ? to.seat : null;
    this.facing = r.facing;
    return this;
  }

  stay(minutes: number, activity: string, opts: { yaw?: number; zone?: ZoneKey | null; stand?: boolean } = {}): this {
    return this.until(this.t + minutes, activity, opts);
  }

  until(t: number, activity: string, opts: { yaw?: number; zone?: ZoneKey | null; stand?: boolean } = {}): this {
    if (t <= this.t + 1e-6) return this;
    const seat = this.seat ? this.net.seats[this.seat] : undefined;
    const yaw = opts.yaw ?? this.facing ?? this.yaw;
    const last = this.segs[this.segs.length - 1];
    // Consecutive stays in the same place read as one (no stand-up in between).
    this.segs.push({
      kind: 'stay',
      t0: this.t,
      t1: t,
      xy: this.xy,
      yaw: unwrap(this.yaw, yaw),
      yawIn: last?.kind === 'stay' ? last.yaw : this.yaw,
      sit: !!seat && !opts.stand,
      h: seat?.h ?? 0.46,
      activity,
      zone: opts.zone ?? seat?.zone ?? this.zoneHere(),
      d0: this.walked,
      rampOut: false,
    });
    this.yaw = unwrap(this.yaw, yaw);
    this.t = t;
    return this;
  }

  hold(item: Item, t0: number, t1: number): this {
    if (t1 > t0) this.carry.push({ t0, t1, item });
    return this;
  }

  /**
   * Continues with another track that starts where this one is (a staff member's
   * errand from their home seat or spot and back).
   */
  append(other: Track): this {
    const last = this.segs[this.segs.length - 1];
    const first = other.segs[0];
    if (last?.kind === 'stay' && last.sit && first?.kind === 'walk') last.rampOut = true;
    for (const seg of other.segs) {
      if (seg.kind === 'stay' && seg === first) seg.yawIn = this.yaw;
      this.segs.push({ ...seg, d0: seg.d0 + this.walked } as Seg);
    }
    this.carry.push(...other.carry);
    this.walked += other.walked;
    this.t = other.t;
    this.xy = other.xy;
    this.node = other.node;
    this.seat = other.seat;
    this.facing = other.facing;
    this.yaw = other.yaw;
    return this;
  }

  private zoneHere(): ZoneKey | null {
    for (const s of Object.values(this.net.spots)) if (s.node === this.node && !this.seat) return s.zone;
    return null;
  }

  get start(): number {
    return this.segs[0]?.t0 ?? this.t;
  }

  get end(): number {
    return this.segs[this.segs.length - 1]?.t1 ?? this.t;
  }

  /** Where the person is and what they are doing at time t; null when not in the scene. */
  sample(t: number): Sample | null {
    const segs = this.segs;
    if (!segs.length) return null;
    const first = segs[0]!;
    const lastSeg = segs[segs.length - 1]!;
    if (t < first.t0) {
      if (this.vanish) return null;
      return this.at(first, first.t0);
    }
    if (t >= lastSeg.t1) {
      if (this.vanish) return null;
      return this.at(lastSeg, lastSeg.t1);
    }
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid]!.t0 <= t) lo = mid;
      else hi = mid - 1;
    }
    return this.at(segs[lo]!, t);
  }

  private at(seg: Seg, t: number): Sample {
    const carrying = this.carry.find((c) => t >= c.t0 && t < c.t1)?.item ?? null;
    if (seg.kind === 'stay') {
      const k = Math.min(1, (t - seg.t0) / TURN);
      let sit = 0;
      if (seg.sit) {
        sit = Math.min(1, (t - seg.t0) / SIT);
        if (seg.rampOut) sit = Math.min(sit, (seg.t1 - t) / SIT);
        sit = smooth(Math.max(0, sit));
      }
      return {
        x: seg.xy[0],
        y: seg.xy[1],
        yaw: seg.yawIn + (seg.yaw - seg.yawIn) * smooth(k),
        sit,
        seatH: seg.h,
        speed: 0,
        dist: seg.d0,
        walking: false,
        activity: seg.activity,
        zone: seg.zone,
        alpha: 1,
        carrying,
      };
    }
    const u = Math.max(0, Math.min(1, (t - seg.t0) / (seg.t1 - seg.t0)));
    const s = u * seg.len;
    const p = pointAt(seg, s);
    const a = pointAt(seg, Math.max(0, s - 0.3));
    const b = pointAt(seg, Math.min(seg.len, s + 0.3));
    let alpha = 1;
    if (this.vanish) {
      if (seg === this.segs[0]) alpha = Math.min(alpha, s / 1.2);
      if (seg === this.segs[this.segs.length - 1]) alpha = Math.min(alpha, (seg.len - s) / 1.2);
    }
    return {
      x: p[0],
      y: p[1],
      yaw: dist(a, b) > 1e-4 ? heading(a, b) : this.yaw,
      sit: 0,
      seatH: 0.46,
      speed: seg.len / (seg.t1 - seg.t0),
      dist: seg.d0 + s,
      walking: true,
      activity: seg.activity,
      zone: seg.zone,
      alpha: Math.max(0, Math.min(1, alpha)),
      carrying,
    };
  }

  /** Every floor point this person walks today, with the time they reach it. */
  path(): { t: number; xy: Vec2 }[] {
    const out: { t: number; xy: Vec2 }[] = [];
    for (const s of this.segs) {
      if (s.kind !== 'walk') continue;
      s.pts.forEach((p, i) => out.push({ t: s.t0 + (s.cum[i]! / s.len) * (s.t1 - s.t0), xy: p }));
    }
    return out;
  }
}

function pointAt(w: Walk, s: number): Vec2 {
  const { pts, cum } = w;
  let i = 1;
  while (i < cum.length - 1 && cum[i]! < s) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span = cum[i]! - cum[i - 1]!;
  const k = span > 0 ? (s - cum[i - 1]!) / span : 0;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

/** Facing from a to b: 0 looks along +y, as in Blender's plan. */
export function heading(a: Vec2, b: Vec2): number {
  return Math.atan2(-(b[0] - a[0]), b[1] - a[1]);
}

function unwrap(prev: number, a: number): number {
  while (a - prev > Math.PI) a -= 2 * Math.PI;
  while (a - prev < -Math.PI) a += 2 * Math.PI;
  return a;
}

function smooth(k: number): number {
  return k * k * (3 - 2 * k);
}
