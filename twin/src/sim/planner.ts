/**
 * Plans a whole day: every visit becomes a walk through the store, every staff member
 * a sequence of errands (welcome, kopi, fetch and consult, see out), and the rooms,
 * seats and people are booked so nothing is used twice at once.
 *
 * Visits are planned in arrival order, greedily, so a visit added during the day
 * never changes what has already happened: only later visits can move.
 */
import { consultFee } from '@drprop/brand/pricing';
import type { Network, PlanData, Vec2, ZoneKey } from '../data.ts';
import { Graph } from './graph.ts';
import { SIT, Track, heading, type Place } from './track.ts';
import { STAFF, TYPES, type CustomerType, type Milestone, type StaffKey, type TypeSpec, type Visit } from './types.ts';

/** Minutes. */
const WELCOME = 2;
const WELCOME_MEMBER = 1.5;
const SNACK = 1.5;
const KOPI = 3;
const SERVE = 0.6;
const GREET = 0.6;
const FAREWELL = 0.8;
const BRIEF = 2;
const CALLBACK = 12;
const DIAGNOSIS_AFTER = 60;
/** The longest a walk-in waits for a consult; beyond it they book a slot. */
const WAIT_MAX = 45;
export const OPEN = 0;
export const CLOSE = 600;

const LOUNGE_SEATS = ['lounge_chair_1', 'lounge_chair_2', 'lounge_sofa_l', 'lounge_sofa_r'];
const WAIT_SEATS: Partial<Record<CustomerType, string[]>> = {
  walkin: ['wall_bench_0', 'wall_bench_1', 'brief_bench_0', 'brief_bench_1'],
  member: ['brief_bench_0', 'brief_bench_1', 'wall_bench_0', 'wall_bench_1'],
  booked: ['brief_bench_0', 'brief_bench_1', 'wall_bench_0', 'wall_bench_1'],
  review: ['wall_bench_0', 'wall_bench_1', 'brief_bench_0', 'brief_bench_1'],
};

export type RoomKey = 'a' | 'b';
export const ROOMS: Record<RoomKey, { staff: StaffKey; seat: string; zone: ZoneKey; label: string }> = {
  a: { staff: 'consultant_a', seat: 'consult_a_1', zone: 'consult_a', label: 'Room A' },
  b: { staff: 'consultant_b', seat: 'consult_b_2', zone: 'consult_b', label: 'Room B' },
};

const SNACKS = ['Kopi Tarik', 'Kuih Seri Muka', 'Kaya Toast', 'Ondeh-Ondeh', 'Pandan Chiffon', 'Kuih Lapis', 'Teh Tarik', 'Pineapple Tart'];

export interface PlannedVisit {
  visit: Visit;
  spec: TypeSpec;
  /** The client walking through the store; null for a video call. */
  track: Track | null;
  at: Partial<Record<Milestone, number>>;
  room: RoomKey | 'booth' | null;
  staff: StaffKey | null;
  fee: number;
  /** Video calls: the two-hour promise. */
  promiseMet?: boolean;
  /** A consult could not fit before closing: asked to come back. */
  deferred?: boolean;
}

export interface Drop {
  t0: number;
  t1: number;
  /** Plan x, y and the table height. */
  at: [number, number, number];
  item: 'cup';
}

export interface DayPlan {
  visits: PlannedVisit[];
  staff: Record<StaffKey, Track>;
  /** Cups left on tables while a guest sits there. */
  drops: Drop[];
  /** Busy times of each staff member, labelled. */
  duties: Record<StaffKey, Busy[]>;
}

export interface Busy {
  t0: number;
  t1: number;
  label: string;
  visit?: string;
}

class Timeline {
  readonly busy: Busy[] = [];
  /** Slots held for bookings known in advance that are not planned yet. */
  readonly holds: Busy[] = [];

  /** The first time from `from` when `dur` minutes are free (and, for walk-ins and errands, not held). */
  earliest(from: number, dur: number, respectHolds = true): number {
    let t = from;
    for (let guard = 0; guard < 500; guard++) {
      const clash =
        this.busy.find((b) => b.t0 < t + dur && t < b.t1) ??
        (respectHolds ? this.holds.find((b) => b.t0 < t + dur && t < b.t1) : undefined);
      if (!clash) return t;
      t = clash.t1;
    }
    return t;
  }

  release(visit: string) {
    for (let i = this.holds.length - 1; i >= 0; i--) if (this.holds[i]!.visit === visit) this.holds.splice(i, 1);
  }

  add(b: Busy) {
    this.busy.push(b);
    this.busy.sort((x, y) => x.t0 - y.t0);
  }
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function plan(data: PlanData, visits: Visit[]): DayPlan {
  return new Planner(data).run(visits);
}

class Planner {
  private readonly net: Network;
  private readonly g: Graph;
  private readonly time: Record<StaffKey, Timeline>;
  private readonly errands: Record<StaffKey, Track[]>;
  private readonly seats = new Map<string, Busy[]>();
  private readonly drops: Drop[] = [];
  private readonly lounge: Vec2;

  constructor(data: PlanData) {
    this.net = data.network;
    this.lounge = data.plan.lounge ?? [data.width - 3.2, 1.9];
    this.g = new Graph(this.net);
    this.time = { host: new Timeline(), consultant_a: new Timeline(), consultant_b: new Timeline(), advisor: new Timeline() };
    this.errands = { host: [], consultant_a: [], consultant_b: [], advisor: [] };
  }

  run(visits: Visit[]): DayPlan {
    const order = [...visits].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    this.hold(order);
    const planned = order.map((v) => {
      for (const t of Object.values(this.time)) t.release(v.id);
      return this.visit(v);
    });
    const staff = {} as Record<StaffKey, Track>;
    for (const key of Object.keys(STAFF) as StaffKey[]) staff[key] = this.staffDay(key);
    const duties = {} as Record<StaffKey, Busy[]>;
    for (const key of Object.keys(STAFF) as StaffKey[]) duties[key] = this.time[key].busy;
    return { visits: planned, staff, drops: this.drops, duties };
  }

  /**
   * Bookings known in advance (not ones added during the day) hold a consultant around
   * their slot, so walk-ins and errands fit around them instead of delaying them.
   */
  private hold(order: Visit[]) {
    for (const v of order) {
      const spec = TYPES[v.type];
      if (!spec.announced || v.added || spec.consult === 0) continue;
      const who: StaffKey[] = v.type === 'urgent' ? ['advisor'] : v.type === 'private' ? ['consultant_b'] : ['consultant_a', 'consultant_b'];
      const t0 = v.at - 4;
      const t1 = v.at + spec.consult + 12;
      const free = who.find((k) => !this.time[k].holds.some((b) => b.t0 < t1 && t0 < b.t1)) ?? who[0]!;
      this.time[free].holds.push({ t0, t1, label: `Held for ${v.id}`, visit: v.id });
    }
  }

  // ------------------------------------------------------------------ helpers

  private home(staff: StaffKey): Place {
    const h = STAFF[staff].home;
    return this.net.seats[h] ? { seat: h } : { spot: h };
  }

  private track(at: Place, t: number): Track {
    return new Track(this.g, this.net, at, t);
  }

  private freeSeat(keys: string[], t0: number, t1: number): string | null {
    for (const k of keys) {
      const list = this.seats.get(k) ?? [];
      if (!list.some((b) => b.t0 < t1 && t0 < b.t1)) return k;
    }
    return null;
  }

  private takeSeat(key: string, t0: number, t1: number, visit: string) {
    const list = this.seats.get(key) ?? [];
    list.push({ t0, t1, label: 'seated', visit });
    this.seats.set(key, list);
  }

  private seatXY(key: string): Vec2 {
    return this.net.seats[key]!.xy;
  }

  /** Where a guest's cup is set down: on the drum table in the Lounge, the brief table by its bench. */
  private table(key: string): [number, number, number] | null {
    const s = this.net.seats[key]!;
    if (s.zone === 'lounge') {
      const [cx, cy] = this.lounge;
      const d = Math.hypot(s.xy[0] - cx, s.xy[1] - cy) || 1;
      return [cx + ((s.xy[0] - cx) / d) * 0.26, cy + ((s.xy[1] - cy) / d) * 0.26, 0.4];
    }
    if (key.startsWith('brief_bench')) return [s.xy[0], s.xy[1] - 0.6, 0.775];
    return null;
  }

  private faceSeat(from: string, seat: string): number {
    return heading(this.g.node(from), this.seatXY(seat));
  }

  private entry(v: Visit): { from: string; to: string } {
    const h = hash(v.id);
    const from = h % 2 ? 'street_w' : 'street_e';
    const to = (h >> 1) % 3 === 0 ? from : from === 'street_w' ? 'street_e' : 'street_w';
    return { from, to };
  }

  // ------------------------------------------------------------------ staff errands

  /** The front desk welcomes someone at reception (no walking). */
  private welcome(arrive: number, minutes: number, v: Visit, words: string): number {
    const t = this.time.host.earliest(arrive, minutes);
    const m = this.track(this.home('host'), t).until(t + minutes, words, { yaw: Math.PI });
    this.time.host.add({ t0: t, t1: t + minutes, label: words, visit: v.id });
    this.errands.host.push(m);
    return t;
  }

  /** Kopi from the pantry to a seat: a consultant if one is free, else the front desk. */
  private kopi(v: Visit, seat: string, sat: number, until: number): number | null {
    const serveAt = this.net.seats[seat]!.via;
    let best: { who: StaffKey; start: number; served: number } | null = null;
    for (const who of ['consultant_a', 'consultant_b'] as StaffKey[]) {
      const probe = this.track(this.home(who), 0).go({ spot: 'pantry_staff' }, '').stay(KOPI, '');
      const toServe = probe.t + probe.travel({ node: serveAt });
      const back = this.track({ node: serveAt }, 0).travel(this.home(who));
      const dur = toServe + SERVE + back + 0.2;
      // Made while they settle in: on the table a minute or two after they sit down.
      const start = this.time[who].earliest(Math.max(sat + 1.5 - toServe, sat - 8, OPEN), dur);
      const served = start + toServe;
      if (!best || served < best.served) best = { who, start, served };
    }
    if (!best || best.served > until - 1.5) return null;
    const { who, start } = best;
    const m = this.track(this.home(who), start);
    m.go({ spot: 'pantry_staff' }, 'To the pantry', 'pantry');
    m.stay(KOPI, `Making kopi for ${v.id}`, { zone: 'pantry' });
    const pick = m.t;
    m.go({ node: serveAt }, `Bringing kopi to ${v.id}`);
    m.hold('cup', pick, m.t + SERVE * 0.6);
    m.stay(SERVE, `Serving kopi to ${v.id}`, { yaw: this.faceSeat(serveAt, seat), zone: this.net.seats[seat]!.zone });
    const served = m.t - SERVE * 0.4;
    m.go(this.home(who), `Back to ${ROOMS[who === 'consultant_a' ? 'a' : 'b'].label}`);
    this.time[who].add({ t0: start, t1: m.t, label: `Kopi for ${v.id}`, visit: v.id });
    this.errands[who].push(m);
    const at = this.table(seat);
    if (at) this.drops.push({ t0: served, t1: until, at, item: 'cup' });
    return served;
  }

  /**
   * A consultant fetches the client from where they wait, takes them to the room,
   * consults, sees them to the door and goes back. The client's track is extended in
   * step. Returns false when nothing fits before closing.
   */
  private consult(v: Visit, c: Track, waitPlace: Place, ready: number, minutes: number, rooms: RoomKey[], waiting: string, latest = Infinity) {
    const respectHolds = !TYPES[v.type].announced || !!v.added;
    const fetchNode = 'seat' in waitPlace ? this.net.seats[waitPlace.seat]!.via : 'spot' in waitPlace ? this.net.spots[waitPlace.spot]!.node : waitPlace.node;
    let best: { room: RoomKey; start: number; arrive: number; dur: number } | null = null;
    for (const room of rooms) {
      const who = ROOMS[room].staff;
      const home = this.home(who);
      const toFetch = this.track(home, 0).travel({ node: fetchNode });
      const toRoom = this.track({ node: fetchNode }, 0).travel(home);
      const out = this.track(home, 0).travel({ node: 'door_in' }) * 2;
      const dur = toFetch + GREET + toRoom + SIT + minutes + 0.4 + out + FAREWELL + 1.5;
      const start = this.time[who].earliest(Math.max(ready - toFetch, 0), dur, respectHolds);
      const arrive = start + toFetch;
      if (!best || arrive < best.arrive) best = { room, start, arrive, dur };
    }
    if (!best || best.arrive + minutes > CLOSE + 5 || best.arrive > latest) return null;
    const { room } = best;
    const who = ROOMS[room].staff;
    const label = ROOMS[room].label;
    const m = this.track(this.home(who), best.start);
    m.go({ node: fetchNode }, `To fetch ${v.id}`);
    const faceClient = 'seat' in waitPlace ? this.faceSeat(fetchNode, waitPlace.seat) : m.yaw;
    m.stay(GREET, `Greeting ${v.id}`, { yaw: faceClient });
    const go = m.t;
    c.until(go + 0.25, waiting);
    c.go({ seat: ROOMS[room].seat }, `To ${label} with the consultant`, ROOMS[room].zone);
    m.go(this.home(who), `Taking ${v.id} to ${label}`, ROOMS[room].zone);
    const start = Math.max(c.t, m.t) + SIT;
    const end = start + minutes;
    c.until(end, `In consult · ${label}`);
    m.until(end + 0.4, `In consult with ${v.id}`);
    m.go({ node: 'door_in' }, `Seeing ${v.id} out`);
    m.stay(FAREWELL, 'Farewell at the door', { yaw: Math.PI });
    m.go(this.home(who), `Back to ${label}`, ROOMS[room].zone);
    this.time[who].add({ t0: best.start, t1: m.t, label: `Consult · ${v.id}`, visit: v.id });
    this.errands[who].push(m);
    return { room, start, end, who, fetched: go };
  }

  // ------------------------------------------------------------------ visits

  private visit(v: Visit): PlannedVisit {
    const spec = TYPES[v.type];
    const pv: PlannedVisit = {
      visit: v,
      spec,
      track: null,
      at: {},
      room: null,
      staff: null,
      fee: spec.fee ? consultFee(spec.fee, v.band) : 0,
    };
    switch (v.type) {
      case 'urgent':
        return this.urgent(v, pv);
      case 'private':
        return this.private(v, pv);
      default:
        return this.front(v, pv);
    }
  }

  private urgent(v: Visit, pv: PlannedVisit): PlannedVisit {
    const s = this.time.advisor.earliest(Math.max(v.at + CALLBACK, OPEN + 1), TYPES.urgent.consult, !!v.added);
    const e = s + TYPES.urgent.consult;
    const m = this.track(this.home('advisor'), s).until(e, `Video call · ${v.id}`);
    this.time.advisor.add({ t0: s, t1: e, label: `Video call · ${v.id}`, visit: v.id });
    this.errands.advisor.push(m);
    pv.room = 'booth';
    pv.staff = 'advisor';
    pv.at = { requested: v.at, callback: s, consult: s, consult_end: e, diagnosis: e + DIAGNOSIS_AFTER };
    pv.promiseMet = s - v.at <= 120;
    return pv;
  }

  private private(v: Visit, pv: PlannedVisit): PlannedVisit {
    const seat = ROOMS.b.seat;
    const probe = this.track({ node: 'private_street' }, 0);
    const walk = probe.travel({ seat });
    const minutes = TYPES.private.consult;
    // Room B is theirs from the moment they sit down; consultant B waits in the room.
    const sitAt = this.time.consultant_b.earliest(v.at - 1.5, minutes + SIT + 4.5, !!v.added) + 1.5;
    const c = this.track({ node: 'private_street' }, sitAt - walk);
    c.vanish = true;
    c.go({ node: 'private_door' }, 'In by the side door', 'private');
    const arrived = c.t;
    c.go({ seat }, 'To Room B', 'consult_b');
    const start = c.t + SIT;
    const end = start + minutes;
    c.until(end, 'In consult · Room B (private)');
    c.go({ node: 'private_street' }, 'Out by the side door', 'private');
    const m = this.track(this.home('consultant_b'), sitAt - 1.5);
    m.until(start, `Receiving ${v.id}`, { stand: true });
    m.until(end + 1, `In consult with ${v.id} (private)`);
    this.time.consultant_b.add({ t0: sitAt - 1.5, t1: end + 1, label: `Private consult · ${v.id}`, visit: v.id });
    this.errands.consultant_b.push(m);
    pv.track = c;
    pv.room = 'b';
    pv.staff = 'consultant_b';
    pv.at = { booked: v.at - 24 * 60, arrived, consult: start, consult_end: end, left: c.end, diagnosis: end + DIAGNOSIS_AFTER };
    return pv;
  }

  /** Everyone who comes in by the front door: walk-ins, members, booked consults, reviews. */
  private front(v: Visit, pv: PlannedVisit): PlannedVisit {
    const spec = TYPES[v.type];
    const { from, to } = this.entry(v);
    const early = v.type === 'booked' ? 6 : v.type === 'review' ? 4 : 0;
    const c = this.track({ node: from }, v.at - early);
    c.vanish = true;
    pv.track = c;
    const at = pv.at;
    if (spec.announced) at.booked = v.at - 24 * 60;
    c.go({ spot: 'reception_guest' }, v.type === 'member' ? 'Walking in · member' : 'Walking in', 'reception');
    at.arrived = c.t;

    const member = v.type === 'member';
    const minutes = member ? WELCOME_MEMBER : v.type === 'review' ? 1 : WELCOME;
    const w = this.welcome(c.t, minutes, v, member ? `Greeting ${v.id} by name` : `Welcoming ${v.id}`);
    if (w > c.t + 0.05) c.until(w, 'Waiting at reception');
    const words = member ? 'Greeted by name · the usual kopi' : v.type === 'walkin' ? 'Welcome · cold towel' : 'Checked in';
    c.stay(minutes, words, { yaw: 0 });
    at.welcomed = c.t;
    c.hold('towel', c.t - minutes * 0.4, c.t + 4);

    if (member) {
      const snack = SNACKS[hash(v.id) % SNACKS.length]!;
      c.go({ spot: 'apothecary_front' }, 'To the apothecary wall', 'apothecary');
      at.snack = c.t;
      c.stay(SNACK, `Rx · ${snack}`);
      const stay = 28 + (hash(v.id + 'stay') % 22);
      const seatFrom = c.t + c.travel({ seat: LOUNGE_SEATS[0]! });
      const seat = this.freeSeat(LOUNGE_SEATS, seatFrom, seatFrom + stay) ?? this.freeSeat(WAIT_SEATS.member!, seatFrom, seatFrom + stay);
      if (seat) {
        c.go({ seat }, 'To the Lounge', 'lounge');
        at.lounge = c.t;
        this.takeSeat(seat, c.t, c.t + stay, v.id);
        const kopi = this.kopi(v, seat, c.t, c.t + stay);
        if (kopi) at.kopi = kopi;
        c.until(c.t + stay, 'In the Lounge');
      }
      c.go({ spot: 'brief_front' }, 'To the market-brief table', 'brief');
      c.stay(BRIEF, "Takes this month's market brief");
      c.hold('brief', c.t - 0.5, c.t + 30);
      c.go({ node: 'door_in' }, 'Leaving').go({ node: to }, 'Leaving');
      at.left = c.end;
      return pv;
    }

    // Everyone else is here for a consult: where do they wait, and for how long?
    const minutesIn = spec.consult;
    const rooms: RoomKey[] = ['a', 'b'];
    const prefer = v.type === 'walkin' ? LOUNGE_SEATS : WAIT_SEATS[v.type]!;
    const ready = Math.max(c.t + 1.5, v.type === 'walkin' ? c.t + 6 : v.at);
    // A first guess of when a consultant can come, to book a seat for long enough.
    const guess = Math.min(...rooms.map((r) => this.time[ROOMS[r].staff].earliest(ready, minutesIn + 12, !spec.announced || !!v.added)));
    const seatFrom = c.t + 1;
    const seat =
      this.freeSeat(prefer, seatFrom, guess + 10) ??
      this.freeSeat(WAIT_SEATS[v.type] ?? [], seatFrom, guess + 10) ??
      this.freeSeat(LOUNGE_SEATS, seatFrom, guess + 10);
    const waitPlace: Place = seat ? { seat } : { spot: 'brief_front' };
    const inLounge = !!seat && LOUNGE_SEATS.includes(seat);
    const waiting = inLounge ? 'In the Lounge' : seat ? 'Waiting · reading the market brief' : 'Waiting by the brief table';
    c.go(waitPlace, inLounge ? 'To the Lounge' : 'To wait', seat ? this.net.seats[seat]!.zone : 'brief');
    if (inLounge) at.lounge = c.t;
    else at.waiting = c.t;
    const sat = c.t;
    // A walk-in who would wait more than WAIT_MAX books a slot instead and is not kept waiting.
    const done = this.consult(v, c, waitPlace, Math.max(ready, sat + 0.5), minutesIn, rooms, waiting, v.type === 'walkin' ? sat + WAIT_MAX : Infinity);
    if (!done) {
      // Nothing fits today: a short stay, a booking for tomorrow, and home.
      const stay = 14;
      if (inLounge) {
        const kopi = this.kopi(v, seat!, sat, sat + stay);
        if (kopi) at.kopi = kopi;
      }
      c.until(sat + stay, 'Kopi · books the next free slot');
      if (seat) this.takeSeat(seat, sat, c.t, v.id);
      c.go({ node: 'door_in' }, 'Leaving').go({ node: to }, 'Leaving');
      pv.deferred = true;
      at.left = c.end;
      return pv;
    }
    if (seat) this.takeSeat(seat, sat, done.fetched + 0.5, v.id);
    if (inLounge) {
      const kopi = this.kopi(v, seat!, sat, done.fetched);
      if (kopi) at.kopi = kopi;
    }
    pv.room = done.room;
    pv.staff = done.who;
    at.consult = done.start;
    at.consult_end = done.end;
    c.go({ node: 'door_in' }, 'Leaving · see you').go({ node: to }, 'Leaving · see you');
    at.left = c.end;
    at.diagnosis = done.end + DIAGNOSIS_AFTER;
    return pv;
  }

  // ------------------------------------------------------------------ staff days

  private staffDay(key: StaffKey): Track {
    const idle: Record<StaffKey, string> = {
      host: 'At the front desk',
      consultant_a: 'In Room A · notes and diagnoses',
      consultant_b: 'In Room B · notes and diagnoses',
      advisor: 'In the booth · on call',
    };
    const t = this.track(this.home(key), OPEN - 30);
    const list = [...this.errands[key]].sort((a, b) => a.start - b.start);
    for (const m of list) {
      t.until(m.start, idle[key]);
      if (m.start < t.t - 1e-6) continue; // overlapping errand: never planned, but never crash
      t.append(m);
    }
    t.until(CLOSE + 60, idle[key]);
    return t;
  }
}
