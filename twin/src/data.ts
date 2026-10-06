/**
 * The store data exported from Blender (blender/export_twin.py): the light glb of each
 * setting and its plan — zones, the walking network, seats and standing spots.
 * Plan coordinates are Blender's: metres, x along the shopfront, y into the store
 * (the street is along y = 0), z up.
 */
import mallPlan from './data/plan-mall.json';
import shophousePlan from './data/plan-shophouse.json';
import mallGlb from './data/store-mall.glb?url';
import shophouseGlb from './data/store-shophouse.glb?url';

export type Vec2 = [number, number];
export type Setting = 'shophouse' | 'mall';
export type ZoneKey =
  | 'reception'
  | 'brief'
  | 'lounge'
  | 'apothecary'
  | 'pantry'
  | 'booth'
  | 'consult_a'
  | 'consult_b'
  | 'entrance'
  | 'private';

export interface Seat {
  xy: Vec2;
  /** The network node a person walks to before sitting down. */
  via: string;
  /** Facing, radians about +z; 0 faces +y. */
  yaw: number;
  /** Seat height, metres. */
  h: number;
  zone: ZoneKey;
  staff?: boolean;
}

export interface Spot {
  node: string;
  yaw: number;
  zone: ZoneKey;
}

export interface Network {
  nodes: Record<string, Vec2>;
  links: [string, string][];
  seats: Record<string, Seat>;
  spots: Record<string, Spot>;
  entries: Record<string, string>;
}

export interface Zone {
  name: string;
  /** [x0, y0, x1, y1] on the floor. */
  rect: [number, number, number, number];
}

export interface PlanData {
  setting: Setting;
  width: number;
  depth: number;
  height: number;
  cut: number;
  plan: Record<string, Vec2>;
  zones: Record<ZoneKey, Zone>;
  network: Network;
  /** [x, y, height, kind] — the twin draws its own plants. */
  plants: [number, number, number, string][];
}

export const SETTINGS: Record<Setting, { plan: PlanData; glb: string; label: string }> = {
  shophouse: { plan: shophousePlan as unknown as PlanData, glb: shophouseGlb, label: 'Shophouse · Petaling Jaya' },
  mall: { plan: mallPlan as unknown as PlanData, glb: mallGlb, label: 'Mall unit · concept' },
};

export const ZONE_KEYS: ZoneKey[] = [
  'reception',
  'brief',
  'lounge',
  'apothecary',
  'pantry',
  'booth',
  'consult_a',
  'consult_b',
  'entrance',
  'private',
];

export function inRect(rect: Zone['rect'], x: number, y: number, pad = 0): boolean {
  return x >= rect[0] - pad && x <= rect[2] + pad && y >= rect[1] - pad && y <= rect[3] + pad;
}
