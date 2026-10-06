import type { Network, Vec2 } from '../data.ts';

/** Shortest walks over the store's walking network (Dijkstra, cached). */
export class Graph {
  private readonly adj = new Map<string, { to: string; w: number }[]>();
  private readonly cache = new Map<string, string[]>();

  constructor(readonly net: Network) {
    for (const [a, b] of net.links) {
      const w = dist(this.node(a), this.node(b));
      this.edges(a).push({ to: b, w });
      this.edges(b).push({ to: a, w });
    }
  }

  node(key: string): Vec2 {
    const p = this.net.nodes[key];
    if (!p) throw new Error(`unknown network node "${key}"`);
    return p;
  }

  private edges(key: string) {
    let list = this.adj.get(key);
    if (!list) this.adj.set(key, (list = []));
    return list;
  }

  /** Node keys from a to b, inclusive. */
  path(a: string, b: string): string[] {
    if (a === b) return [a];
    const id = `${a}>${b}`;
    const hit = this.cache.get(id);
    if (hit) return hit;
    const best = new Map<string, number>([[a, 0]]);
    const prev = new Map<string, string>();
    const open = new Set<string>([a]);
    while (open.size) {
      let cur = '';
      let curD = Infinity;
      for (const k of open) {
        const d = best.get(k) ?? Infinity;
        if (d < curD) [cur, curD] = [k, d];
      }
      open.delete(cur);
      if (cur === b) break;
      for (const { to, w } of this.adj.get(cur) ?? []) {
        const d = curD + w;
        if (d < (best.get(to) ?? Infinity)) {
          best.set(to, d);
          prev.set(to, cur);
          open.add(to);
        }
      }
    }
    if (!best.has(b)) throw new Error(`no walk from "${a}" to "${b}"`);
    const out = [b];
    while (out[0] !== a) out.unshift(prev.get(out[0]!)!);
    this.cache.set(id, out);
    return out;
  }
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function polylineLength(pts: Vec2[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1]!, pts[i]!);
  return s;
}
