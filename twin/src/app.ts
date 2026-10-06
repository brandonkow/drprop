/**
 * The store twin: one simulated day in the 3D store, with the dashboard around it.
 * Everything on screen is derived from the day plan (sim/planner.ts) at the current
 * time, so scrubbing, replaying and adding a visit all stay consistent.
 */
import { Plane, Raycaster, Vector2, Vector3, type Object3D } from 'three';
import logoSvg from '@drprop/brand/logo/logo.svg?raw';
import { bands, type PriceBand } from '@drprop/brand/pricing';
import { STORE, ZONES, privateRole } from './content.ts';
import { inRect, SETTINGS, ZONE_KEYS, type PlanData, type Setting, type ZoneKey } from './data.ts';
import { dress, type Traffic } from './scene/dressing.ts';
import { Overlay } from './scene/overlay.ts';
import { Figure } from './scene/people.ts';
import { Stage, v3 } from './scene/stage.ts';
import { Store, type WallMode } from './scene/store.ts';
import { sampleDay } from './sim/day.ts';
import { CLOSE, ROOMS, plan, type DayPlan, type PlannedVisit } from './sim/planner.ts';
import { BAND_LABEL, STAFF, TYPES, TYPE_KEYS, type CustomerType, type StaffKey, type Visit } from './sim/types.ts';
import { clock, esc, known, rm, status } from './ui/format.ts';

type Selection = { kind: 'visit'; id: string } | { kind: 'zone'; key: ZoneKey } | { kind: 'staff'; key: StaffKey } | null;

const SPEEDS: [string, number][] = [
  ['1×', 0.5],
  ['2×', 1],
  ['4×', 2],
  ['10×', 5],
];
const END = CLOSE + 40;
const HOME = { azimuth: -0.62, polar: 0.98 };
const BANDS: PriceBand[] = ['300k-600k', '600k-1m', 'lt300k', '1m-2m', 'gt2m'];

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;

export class App {
  private readonly stage: Stage;
  private store: Store | null = null;
  private overlay = new Overlay();
  private figures = new Map<string, Figure>();
  private traffic: Traffic | null = null;
  private dressing: Object3D | null = null;
  private setting: Setting = 'shophouse';
  private data: PlanData = SETTINGS.shophouse.plan;
  private visits: Visit[] = sampleDay();
  private day!: DayPlan;
  private t = 0;
  private playing = true;
  private speed = 1;
  private selection: Selection = null;
  private hidden = new Set<CustomerType>();
  private follow = false;
  private hover: { person?: string; zone?: ZoneKey } = {};
  private added = 0;
  private search = '';
  private turn: { from: number; to: number; polarFrom: number; polarTo: number; k: number } | null = null;
  private zoomTo: number | null = null;
  private lastUi = 0;
  private uiDirty = true;
  private pointer = new Vector2();
  private pointerPx = { x: 0, y: 0 };
  private pickQueued = false;
  private readonly ray = new Raycaster();
  private readonly el = {
    twin: $<HTMLElement>('.twin'),
    canvas: $<HTMLCanvasElement>('.scene'),
    pins: $<HTMLElement>('.pins'),
    tip: $<HTMLElement>('.tip'),
    clock: $<HTMLElement>('.clock'),
    play: $<HTMLButtonElement>('[data-play]'),
    speed: $<HTMLElement>('.speed'),
    site: $<HTMLSelectElement>('.bar__site select'),
    search: $<HTMLInputElement>('.bar__search input'),
    kpis: $<HTMLElement>('.kpis'),
    types: $<HTMLElement>('.types__list'),
    right: $<HTMLElement>('.right'),
    steps: $<HTMLElement>('.steps'),
    trackId: $<HTMLElement>('.track__id'),
    tbody: $<HTMLElement>('.book tbody'),
    range: $<HTMLInputElement>('.timeline input'),
    walls: $<HTMLButtonElement>('[data-walls]'),
  };
  private rows = new Map<string, HTMLTableRowElement>();
  /** When the person last scrolled the bookings table: until then it follows the clock. */
  private tableTouched = 0;
  private pinEls = new Map<string, HTMLElement>();

  constructor() {
    this.stage = new Stage(this.el.canvas);
    this.stage.scene.add(this.overlay.group);
  }

  async start() {
    this.buildChrome();
    this.bind();
    await this.load('shophouse');
    this.el.twin.dataset.state = 'ready';
    const loop = (now: number) => {
      this.frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ setup

  private buildChrome() {
    $('.bar__logo').innerHTML = logoSvg.replace(/<title>.*?<\/title>/s, '');
    for (const [key, s] of Object.entries(SETTINGS)) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = s.label;
      this.el.site.append(o);
    }
    this.el.speed.innerHTML = SPEEDS.map(
      ([label, v]) => `<button type="button" role="radio" aria-checked="${v === this.speed}" data-speed="${v}">${label}</button>`,
    ).join('');
    this.el.types.innerHTML = TYPE_KEYS.map(
      (k) => `<li data-type="${k}" style="--c:${TYPES[k].ring}">
        <span class="type-dot" aria-hidden="true"></span>
        <button type="button" class="types__name" data-filter="${k}" title="Show or hide ${esc(TYPES[k].label)}">${esc(TYPES[k].label)}</button>
        <span class="types__n now" title="In the store now">0</span>
        <span class="types__n today" title="Today">0</span>
        <button type="button" class="add" data-add="${k}" aria-label="Add a ${esc(TYPES[k].label)} visit now">+ Add</button>
      </li>`,
    ).join('');
    this.el.pins.innerHTML = '';
    for (const key of ZONE_KEYS) {
      const pin = document.createElement('div');
      pin.className = 'pin';
      pin.innerHTML = `<button type="button" class="pin__tag" data-zone="${key}"><span class="pin__name"></span><span class="pin__n"></span></button><span class="pin__stem"></span><span class="pin__foot"></span>`;
      this.el.pins.append(pin);
      this.pinEls.set(key, pin);
    }
    const person = document.createElement('div');
    person.className = 'pin pin--person';
    person.innerHTML = `<span class="pin__tag"><span class="pin__name"></span></span><span class="pin__stem"></span><span class="pin__foot"></span>`;
    person.hidden = true;
    this.el.pins.append(person);
    this.pinEls.set('person', person);
  }

  private bind() {
    this.el.play.addEventListener('click', () => this.setPlaying(!this.playing));
    this.el.speed.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-speed]');
      if (!b) return;
      this.speed = Number(b.dataset.speed);
      for (const x of this.el.speed.querySelectorAll('button')) x.setAttribute('aria-checked', String(x === b));
    });
    this.el.range.addEventListener('input', () => {
      this.t = Number(this.el.range.value);
      this.uiDirty = true;
    });
    this.el.site.addEventListener('change', () => void this.load(this.el.site.value as Setting));
    this.el.search.addEventListener('input', () => {
      this.search = this.el.search.value.trim().toLowerCase();
      this.renderTable();
    });
    this.el.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.find(this.search);
      if (e.key === 'Escape') {
        this.el.search.value = '';
        this.search = '';
        this.renderTable();
      }
    });
    this.el.types.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const add = t.closest<HTMLElement>('[data-add]');
      if (add) return this.addVisit(add.dataset.add as CustomerType);
      const f = t.closest<HTMLElement>('[data-filter]');
      if (f) {
        const k = f.dataset.filter as CustomerType;
        if (this.hidden.has(k)) this.hidden.delete(k);
        else this.hidden.add(k);
        f.closest('li')!.classList.toggle('is-off', this.hidden.has(k));
        this.renderTable();
        this.uiDirty = true;
      }
    });
    const scroller = $<HTMLElement>('.book__scroll');
    for (const ev of ['wheel', 'touchmove', 'pointerdown'] as const) scroller.addEventListener(ev, () => (this.tableTouched = performance.now()), { passive: true });
    this.el.tbody.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]');
      if (row) this.select({ kind: 'visit', id: row.dataset.id! }, true);
    });
    this.el.pins.addEventListener('click', (e) => {
      const z = (e.target as HTMLElement).closest<HTMLElement>('[data-zone]');
      if (z) this.select({ kind: 'zone', key: z.dataset.zone as ZoneKey });
    });
    this.el.right.addEventListener('click', (e) => this.onDetailClick(e));
    $('.tools').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.walls !== undefined) return this.cycleWalls();
      this.view(b.dataset.view!);
    });
    const c = this.el.canvas;
    let down: { x: number; y: number } | null = null;
    c.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    c.addEventListener('pointerup', (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) this.click();
      down = null;
    });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      this.pointerPx = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.pointer.set((this.pointerPx.x / r.width) * 2 - 1, -(this.pointerPx.y / r.height) * 2 + 1);
      this.pickQueued = true;
    });
    c.addEventListener('pointerleave', () => {
      this.hover = {};
      this.el.tip.hidden = true;
      this.overlayZone();
    });
    this.stage.controls.addEventListener('start', () => {
      this.follow = false;
      this.turn = null;
      this.zoomTo = null;
    });
    window.addEventListener('resize', () => this.layout());
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === ' ') {
        e.preventDefault();
        this.setPlaying(!this.playing);
      }
      if (e.key === 'Escape') this.select(null);
    });
  }

  private setPlaying(on: boolean) {
    this.playing = on;
    if (on && this.t >= END - 0.01) this.t = 0;
    this.el.play.classList.toggle('is-paused', !on);
    this.el.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }

  // ------------------------------------------------------------------ store, plan, people

  private async load(setting: Setting) {
    this.el.twin.dataset.state = 'loading';
    this.setting = setting;
    this.data = SETTINGS[setting].plan;
    this.el.site.value = setting;
    const store = await Store.load(this.data, SETTINGS[setting].glb);
    if (this.store) this.stage.scene.remove(this.store.root);
    if (this.dressing) this.stage.scene.remove(this.dressing);
    this.store = store;
    this.stage.scene.add(store.root);
    const d = dress(this.data, store.island);
    this.dressing = d.group;
    this.traffic = d.traffic;
    this.stage.scene.add(d.group);
    const centre = v3(this.data.width / 2, this.data.depth / 2 - 0.6, 0.6);
    this.stage.placeSun(centre);
    this.replan();
    this.layout();
    this.stage.aim(centre, HOME.azimuth, HOME.polar);
    this.stage.camera.zoom = 1;
    this.stage.camera.updateProjectionMatrix();
    this.el.twin.dataset.state = 'ready';
  }

  private replan() {
    this.day = plan(this.data, this.visits);
    for (const f of this.figures.values()) {
      this.stage.scene.remove(f.root);
      f.dispose();
    }
    this.figures.clear();
    for (const pv of this.day.visits) {
      if (!pv.track) continue;
      const f = new Figure(pv.visit.id, pv.track, { top: pv.spec.top, trousers: pv.spec.trousers, ring: pv.spec.ring });
      this.figures.set(pv.visit.id, f);
      this.stage.scene.add(f.root);
    }
    for (const [key, track] of Object.entries(this.day.staff) as [StaffKey, DayPlan['staff'][StaffKey]][]) {
      const s = STAFF[key];
      const f = new Figure(key, track, { top: s.top, trousers: s.trousers, ring: '#1C1B19' });
      this.figures.set(key, f);
      this.stage.scene.add(f.root);
    }
    this.overlay.setCups(this.day.drops);
    this.renderTable();
    this.applySelection();
    this.uiDirty = true;
  }

  private visit(id: string): PlannedVisit | undefined {
    return this.day.visits.find((v) => v.visit.id === id);
  }

  private addVisit(type: CustomerType) {
    const early = type === 'booked' ? 6 : type === 'review' ? 4 : 0;
    this.added += 1;
    const id = `DP-${String(900 + this.added).padStart(4, '0')}`;
    const band = type === 'private' ? 'gt2m' : BANDS[this.added % BANDS.length]!;
    const v: Visit = { id, type, at: this.t + early + 0.5, band, note: `${TYPES[type].label} · added ${clock(this.t)}`, added: true };
    this.visits = [...this.visits, v];
    this.replan();
    this.select({ kind: 'visit', id }, true);
    if (!this.playing) this.setPlaying(true);
  }

  // ------------------------------------------------------------------ selection

  private select(sel: Selection, focus = false) {
    this.selection = sel;
    this.follow = false;
    this.applySelection();
    this.uiDirty = true;
    if (focus && sel?.kind === 'visit') {
      const row = this.rows.get(sel.id);
      row?.scrollIntoView({ block: 'nearest' });
    }
  }

  private applySelection() {
    const sel = this.selection;
    for (const [key, f] of this.figures) f.selected = (sel?.kind === 'visit' && sel.id === key) || (sel?.kind === 'staff' && sel.key === key);
    let route: { t: number; xy: [number, number] }[] = [];
    let color: string | null = null;
    if (sel?.kind === 'visit') {
      const pv = this.visit(sel.id);
      if (pv?.track) {
        route = pv.track.path();
        color = pv.spec.ring;
      }
    } else if (sel?.kind === 'staff') {
      route = this.day.staff[sel.key].path().filter((p) => Math.abs(p.t - this.t) < 60);
      color = '#1C1B19';
    }
    this.overlay.setRoute(route, color);
    this.store?.setHighlight(sel?.kind === 'zone' ? sel.key : null);
    this.overlayZone();
    for (const [key, pin] of this.pinEls) pin.classList.toggle('is-selected', sel?.kind === 'zone' && sel.key === key);
    for (const [id, row] of this.rows) row.classList.toggle('is-selected', sel?.kind === 'visit' && sel.id === id);
  }

  private overlayZone() {
    const sel = this.selection;
    const key = sel?.kind === 'zone' ? sel.key : this.hover.zone;
    const zone = key ? this.data.zones[key] : undefined;
    this.overlay.zone(zone?.rect ?? null, sel?.kind === 'zone' && sel.key === key);
  }

  private find(q: string) {
    if (!q) return;
    const v = this.day.visits.find((x) => `${x.visit.id} ${x.visit.note} ${x.spec.label}`.toLowerCase().includes(q));
    if (v) return this.select({ kind: 'visit', id: v.visit.id }, true);
    const z = ZONE_KEYS.find((k) => ZONES[k].name.toLowerCase().includes(q));
    if (z) return this.select({ kind: 'zone', key: z });
    const s = (Object.keys(STAFF) as StaffKey[]).find((k) => STAFF[k].label.toLowerCase().includes(q));
    if (s) this.select({ kind: 'staff', key: s });
  }

  // ------------------------------------------------------------------ picking

  private pick(): { person?: string; zone?: ZoneKey } {
    this.ray.setFromCamera(this.pointer, this.stage.camera);
    const people = [...this.figures.values()].filter((f) => f.root.visible).map((f) => f.root);
    const hit = this.ray.intersectObjects(people, true)[0];
    if (hit) return { person: hit.object.userData.person as string };
    if (this.store) {
      for (const h of this.ray.intersectObject(this.store.root, true)) {
        const z = h.object.userData.zone as string | undefined;
        if (z && z in ZONES && h.point.y < 1.4) return { zone: z as ZoneKey };
      }
    }
    // Otherwise the floor: which zone's outline is the pointer over?
    const p = new Vector3();
    if (this.ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), p)) {
      const x = p.x;
      const y = -p.z;
      for (const key of ['consult_a', 'consult_b', 'booth', 'pantry', 'brief', 'lounge', 'apothecary', 'reception', 'entrance', 'private'] as ZoneKey[]) {
        const z = this.data.zones[key];
        if (z && inRect(z.rect, x, y)) return { zone: key };
      }
    }
    return {};
  }

  private click() {
    const h = this.pick();
    if (h.person) {
      if (h.person in STAFF) this.select({ kind: 'staff', key: h.person as StaffKey });
      else this.select({ kind: 'visit', id: h.person }, true);
    } else if (h.zone) this.select({ kind: 'zone', key: h.zone });
    else this.select(null);
  }

  private hoverUpdate() {
    if (!this.pickQueued) return;
    this.pickQueued = false;
    const h = this.pick();
    const changed = h.person !== this.hover.person || h.zone !== this.hover.zone;
    this.hover = h;
    this.el.canvas.classList.toggle('is-hover', !!(h.person || h.zone));
    if (changed) this.overlayZone();
    const tip = this.el.tip;
    if (h.person) {
      const f = this.figures.get(h.person);
      const s = f?.state;
      const pv = this.visit(h.person);
      const who = pv ? `${pv.visit.id} · ${pv.spec.label}` : STAFF[h.person as StaffKey]?.label ?? h.person;
      tip.innerHTML = `<strong>${esc(who)}</strong>${esc(s?.activity ?? '')}`;
    } else if (h.zone) {
      tip.innerHTML = `<strong>${esc(ZONES[h.zone].name)}</strong>${esc(this.zoneLine(h.zone))}`;
    }
    tip.hidden = !(h.person || h.zone);
    tip.style.left = `${this.pointerPx.x}px`;
    tip.style.top = `${this.pointerPx.y}px`;
  }

  // ------------------------------------------------------------------ view

  private layout() {
    const canvas = this.el.canvas.getBoundingClientRect();
    const r = (sel: string) => $<HTMLElement>(sel).getBoundingClientRect();
    const stacked = window.matchMedia('(max-width: 1020px)').matches;
    let frame = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    if (!stacked) {
      const left = r('.left').right - canvas.left;
      const right = r('.right').left - canvas.left;
      const top = r('.bar').bottom - canvas.top;
      const bottom = Math.min(r('.track').top, r('.timeline').top) - canvas.top;
      frame = { x: left + 40, y: top + 10, w: right - left - 80, h: bottom - top - 20 };
    }
    this.stage.setFrame(frame, stacked ? 15 : 13.2);
  }

  private view(kind: string) {
    const c = this.stage.controls;
    const az = c.getAzimuthalAngle();
    const polar = c.getPolarAngle();
    const turn = (to: number, polarTo = polar) => (this.turn = { from: az, to, polarFrom: polar, polarTo, k: 0 });
    if (kind === 'left') turn(az + Math.PI / 2);
    if (kind === 'right') turn(az - Math.PI / 2);
    if (kind === 'in') this.zoomTo = Math.min(6, this.stage.camera.zoom * 1.3);
    if (kind === 'out') this.zoomTo = Math.max(0.6, this.stage.camera.zoom / 1.3);
    if (kind === 'plan') turn(0, 0.13);
    if (kind === 'home') {
      const centre = v3(this.data.width / 2, this.data.depth / 2 - 0.6, 0.6);
      this.stage.controls.target.copy(centre);
      turn(HOME.azimuth, HOME.polar);
      this.zoomTo = 1;
    }
  }

  private cycleWalls() {
    const order: WallMode[] = ['cut', 'up', 'down'];
    const next = order[(order.indexOf(this.store?.wallMode ?? 'cut') + 1) % 3]!;
    this.store?.setWalls(next);
    this.el.walls.title = `Walls: ${next === 'cut' ? 'cutaway' : next}`;
    this.el.walls.setAttribute('aria-label', this.el.walls.title);
  }

  private animateView(dt: number) {
    const c = this.stage.controls;
    const cam = this.stage.camera;
    if (this.turn) {
      const tw = this.turn;
      tw.k = Math.min(1, tw.k + dt / 0.7);
      const e = 1 - Math.pow(1 - tw.k, 3);
      let d = tw.to - tw.from;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const az = tw.from + d * e;
      const polar = tw.polarFrom + (tw.polarTo - tw.polarFrom) * e;
      const dist = cam.position.distanceTo(c.target);
      cam.position.copy(c.target).add(new Vector3(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az)).multiplyScalar(dist));
      cam.lookAt(c.target);
      if (tw.k >= 1) this.turn = null;
    }
    if (this.zoomTo !== null) {
      cam.zoom += (this.zoomTo - cam.zoom) * (1 - Math.exp(-dt * 8));
      cam.updateProjectionMatrix();
      if (Math.abs(cam.zoom - this.zoomTo) < 0.005) this.zoomTo = null;
    }
    if (this.follow && this.selection && this.selection.kind !== 'zone') {
      const key = this.selection.kind === 'visit' ? this.selection.id : this.selection.key;
      const s = this.figures.get(key)?.state;
      if (s) {
        const want = v3(s.x, s.y, 0.6);
        const delta = want.sub(c.target).multiplyScalar(1 - Math.exp(-dt * 3));
        c.target.add(delta);
        cam.position.add(delta);
      }
    }
  }

  // ------------------------------------------------------------------ frame

  private last = 0;
  private slow = { frames: 0, total: 0 };

  private frame(now: number) {
    const raw = this.last ? (now - this.last) / 1000 : 0;
    const dt = Math.min(0.1, raw);
    this.last = now;
    // A slow device drops the ambient occlusion and anti-aliasing passes (once, early on).
    if (this.stage.quality === 'high' && raw > 0 && this.slow.frames < 120) {
      this.slow.frames += 1;
      this.slow.total += raw;
      if (this.slow.frames === 120 && this.slow.total / 120 > 0.05) this.stage.setQuality('low');
    }
    if (this.playing) {
      this.t = Math.min(END, this.t + dt * this.speed);
      if (this.t >= END) this.setPlaying(false);
    }
    this.animateView(dt);
    const cam = this.stage.camera;
    const dir = cam.position.clone().sub(this.stage.controls.target).normalize();
    this.store?.update(dt, dir);
    for (const [key, f] of this.figures) {
      f.update(this.t);
      const pv = this.visit(key);
      if (pv && this.hidden.has(pv.visit.type)) f.root.visible = false;
    }
    this.overlay.update(this.t);
    this.traffic?.update(this.t);
    this.hoverUpdate();
    this.stage.render();
    this.placePins();
    if (this.uiDirty || now - this.lastUi > 150) {
      this.lastUi = now;
      this.uiDirty = false;
      this.renderUi();
    }
  }

  private placePins() {
    const cam = this.stage.camera;
    const w = this.el.canvas.clientWidth;
    const h = this.el.canvas.clientHeight;
    const v = new Vector3();
    /** The tag stands at `top`; its stem runs down to `foot` on the floor. */
    const put = (el: HTMLElement, foot: Vector3, top: Vector3) => {
      v.copy(foot).project(cam);
      const fx = ((v.x + 1) / 2) * w;
      const fy = ((1 - v.y) / 2) * h;
      v.copy(top).project(cam);
      const ty = ((1 - v.y) / 2) * h;
      const stem = Math.max(6, fy - ty);
      el.style.setProperty('--stem', `${stem}px`);
      el.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -100%)`;
    };
    const walls = this.store?.wallMode ?? 'cut';
    for (const key of ZONE_KEYS) {
      const z = this.data.zones[key];
      const el = this.pinEls.get(key);
      if (!z || !el) continue;
      const [x0, y0, x1, y1] = z.rect;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      put(el, v3(cx, cy, 0.05), v3(cx, cy, walls === 'up' ? 2.8 : 1.7));
    }
    const pin = this.pinEls.get('person')!;
    const sel = this.selection;
    const key = sel?.kind === 'visit' ? sel.id : sel?.kind === 'staff' ? sel.key : null;
    const s = key ? this.figures.get(key)?.state : null;
    pin.hidden = !s || !this.figures.get(key!)?.root.visible;
    if (s && !pin.hidden) put(pin, v3(s.x, s.y, 1.75 - s.sit * 0.4), v3(s.x, s.y, 2.3 - s.sit * 0.4));
  }

  // ------------------------------------------------------------------ dashboard

  private renderUi() {
    const t = this.t;
    this.el.clock.textContent = clock(t);
    if (document.activeElement !== this.el.range) this.el.range.value = String(Math.max(0, Math.min(CLOSE, t)));
    const states = this.day.visits.map((pv) => ({ pv, s: pv.track?.sample(t) ?? null }));
    const inside = (s: { x: number; y: number } | null) => !!s && s.x >= -0.2 && s.x <= this.data.width + 0.2 && s.y >= -0.2 && s.y <= this.data.depth + 0.2;
    // Zone pins: how many people are in each zone now.
    const count = new Map<ZoneKey, number>();
    const everyone = [...states.map((x) => x.s), ...(Object.values(this.day.staff).map((tr) => tr.sample(t)))];
    for (const s of everyone) {
      if (!s) continue;
      for (const key of ZONE_KEYS) {
        const z = this.data.zones[key];
        if (z && inRect(z.rect, s.x, s.y)) {
          count.set(key, (count.get(key) ?? 0) + 1);
          break;
        }
      }
    }
    for (const key of ZONE_KEYS) {
      const el = this.pinEls.get(key)!;
      $('.pin__name', el).textContent = ZONES[key].name.replace('Consult room', 'Room').replace('Apothecary wall', 'Apothecary');
      const n = count.get(key) ?? 0;
      $('.pin__n', el).textContent = n ? String(n) : '';
      el.classList.toggle('is-quiet', !n && !(this.selection?.kind === 'zone' && this.selection.key === key));
    }
    const sel = this.selection;
    const personPin = this.pinEls.get('person')!;
    if (sel?.kind === 'visit') $('.pin__name', personPin).textContent = sel.id;
    if (sel?.kind === 'staff') $('.pin__name', personPin).textContent = STAFF[sel.key].label;

    this.renderKpis(t, states, inside);
    this.renderTypes(t, states, inside);
    this.renderStatuses(t);
    this.renderSteps(t);
    this.renderDetail(t);
  }

  private renderKpis(t: number, states: { pv: PlannedVisit; s: ReturnType<NonNullable<PlannedVisit['track']>['sample']> }[], inside: (s: { x: number; y: number } | null) => boolean) {
    const here = states.filter((x) => inside(x.s));
    const waiting = here.filter((x) => /Waiting|In the Lounge/.test(x.s!.activity) && x.pv.spec.consult > 0 && t < (x.pv.at.consult ?? Infinity)).length;
    const loungeSeats = ZONES.lounge.seats;
    const seated = everyoneSeatedIn(this.day, t, 'lounge');
    const rooms = (['a', 'b'] as const).map((r) => {
      const pv = this.day.visits.find((v) => v.room === r && t >= (v.at.consult ?? Infinity) && t < (v.at.consult_end ?? -Infinity));
      if (pv) return { r, busy: true, text: `${pv.visit.id} · ${Math.ceil(pv.at.consult_end! - t)} min left` };
      const duty = this.day.duties[ROOMS[r].staff].find((d) => t >= d.t0 && t < d.t1);
      return { r, busy: false, text: duty ? duty.label.replace(/ · DP-\d+/, '') : 'Free' };
    });
    const calls = this.day.visits.filter((v) => v.visit.type === 'urgent');
    const onCall = calls.find((v) => t >= v.at.consult! && t < v.at.consult_end!);
    const nextCall = calls.filter((v) => v.at.callback! > t && v.at.requested! <= t).sort((a, b) => a.at.callback! - b.at.callback!)[0];
    const consults = this.day.visits.filter((v) => v.spec.consult > 0 && v.at.consult !== undefined);
    const done = consults.filter((v) => v.at.consult_end! <= t);
    const fees = done.reduce((s, v) => s + v.fee, 0);
    const kopi = this.day.drops.filter((d) => d.t0 <= t).length;
    this.el.kpis.innerHTML = `
      <div class="kpi"><span class="label">In the store</span><span class="kpi__value">${here.length}</span><p class="kpi__sub">${waiting ? `guests · ${waiting} waiting` : 'guests · 4 team'}</p></div>
      <div class="kpi"><span class="label">Lounge</span><span class="kpi__value">${seated}<small> / ${loungeSeats}</small></span><div class="cells">${Array.from({ length: loungeSeats }, (_, i) => `<span class="${i < seated ? 'on' : ''}"></span>`).join('')}</div><p class="kpi__sub">${seated === 0 ? 'Quiet' : seated >= loungeSeats ? 'Full' : seated >= 3 ? 'Busy' : 'Calm'} · ${kopi} kopi</p></div>
      <div class="kpi kpi--wide"><span class="label">Consult rooms</span><span class="kpi__value">${rooms.filter((r) => r.busy).length}<small> of 2 in use</small></span>
        <div class="rooms">${rooms.map((r) => `<div><span class="label">Room ${r.r.toUpperCase()}</span><span>${esc(r.text)}</span></div>`).join('')}</div></div>
      <div class="kpi"><span class="label">Video line</span><span class="kpi__value">${onCall ? 'On call' : 'Free'}</span><p class="kpi__sub">${nextCall ? `Next by ${clock(nextCall.at.callback!)}` : 'Within 2 h'}</p></div>
      <div class="kpi"><span class="label">Consults today</span><span class="kpi__value">${done.length}<small> / ${consults.length}</small></span><p class="kpi__sub">${rm(fees)} fees</p></div>`;
  }

  private renderTypes(t: number, states: { pv: PlannedVisit; s: unknown }[], inside: (s: { x: number; y: number } | null) => boolean) {
    for (const k of TYPE_KEYS) {
      const li = $<HTMLElement>(`li[data-type="${k}"]`, this.el.types);
      const list = states.filter((x) => x.pv.visit.type === k);
      const now =
        k === 'urgent'
          ? list.filter((x) => t >= x.pv.at.consult! && t < x.pv.at.consult_end!).length
          : list.filter((x) => inside(x.s as { x: number; y: number } | null)).length;
      const today = list.filter((x) => known(x.pv, t)).length;
      $('.now', li).textContent = String(now);
      $('.today', li).textContent = String(today);
    }
  }

  private renderTable() {
    const tb = this.el.tbody;
    tb.innerHTML = '';
    this.rows.clear();
    const list = [...this.day.visits].sort((a, b) => a.visit.at - b.visit.at || a.visit.id.localeCompare(b.visit.id));
    for (const pv of list) {
      const v = pv.visit;
      const hay = `${v.id} ${v.note} ${pv.spec.label} ${BAND_LABEL[v.band]}`.toLowerCase();
      if (this.search && !hay.includes(this.search)) continue;
      if (this.hidden.has(v.type)) continue;
      const tr = document.createElement('tr');
      tr.dataset.id = v.id;
      const where = pv.room === 'booth' ? 'Booth · video' : pv.room ? ROOMS[pv.room].label : v.type === 'member' ? 'Lounge' : '—';
      tr.innerHTML = `
        <td class="t">${clock(v.type === 'urgent' ? pv.at.callback ?? v.at : v.at)}</td>
        <td class="id">${esc(v.id)}</td>
        <td><span class="type" style="--c:${pv.spec.ring}"><span class="type-dot"></span>${esc(pv.spec.label)}</span></td>
        <td class="case" title="${esc(v.note)} · ${esc(BAND_LABEL[v.band])}">${esc(v.note)}</td>
        <td class="num">${pv.fee ? rm(pv.fee) : '—'}</td>
        <td>${esc(where)}</td>
        <td><span class="status"></span></td>`;
      tb.append(tr);
      this.rows.set(v.id, tr);
    }
    this.applySelection();
    this.uiDirty = true;
  }

  private renderStatuses(t: number) {
    let first: HTMLTableRowElement | null = null;
    for (const [id, row] of this.rows) {
      const pv = this.visit(id);
      if (!pv) continue;
      const vis = known(pv, t);
      row.hidden = !vis;
      if (!vis) continue;
      const st = status(pv, t);
      const cell = $<HTMLElement>('.status', row);
      if (cell.textContent !== st.text) cell.textContent = st.text;
      cell.className = `status ${st.tone}`;
      row.classList.toggle('is-past', st.tone === 'done');
      if (!first && st.tone !== 'done') first = row;
    }
    // Keep the rows that matter now in view, unless the person is reading the table.
    if (first && performance.now() - this.tableTouched > 8000) {
      const scroller = $<HTMLElement>('.book__scroll');
      const head = scroller.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      const want = Math.max(0, first.offsetTop - head);
      if (Math.abs(scroller.scrollTop - want) > 2) scroller.scrollTop = want;
    }
  }

  /** The visit the tracker follows: the selected one, else the latest that is in the store. */
  private trackedVisit(t: number): PlannedVisit | undefined {
    const sel = this.selection;
    if (sel?.kind === 'visit') return this.visit(sel.id);
    const live = this.day.visits.filter((v) => v.track && t >= v.track.start && t < v.track.end && !this.hidden.has(v.visit.type));
    return live.sort((a, b) => b.track!.start - a.track!.start)[0] ?? this.day.visits.find((v) => known(v, t) && (v.track?.start ?? v.at.callback ?? 0) > t);
  }

  private renderSteps(t: number) {
    const pv = this.trackedVisit(t);
    if (!pv) {
      this.el.trackId.textContent = '';
      this.el.steps.innerHTML = '<li class="next"><span class="step__mark"></span><span>No visit in progress</span></li>';
      return;
    }
    this.el.trackId.textContent = `${pv.visit.id} · ${pv.spec.label}`;
    const steps = pv.spec.steps.map(([m, label]) => ({ label, at: pv.at[m] }));
    let current = -1;
    steps.forEach((s, i) => {
      if (s.at !== undefined && s.at <= t) current = i;
    });
    const finished = current === steps.length - 1;
    const html = steps
      .map((s, i) => {
        const cls = i < current || (finished && i === current) ? 'done' : i === current ? 'now' : 'next';
        const when = s.at === undefined ? (pv.deferred ? 'later slot' : '—') : s.at < -600 ? 'yesterday' : `${s.at > t ? '~' : ''}${clock(s.at)}`;
        return `<li class="${cls}"><span class="step__mark"></span><span>${esc(s.label)}</span><span class="step__time">${when}</span></li>`;
      })
      .join('');
    const st = status(pv, t);
    this.el.steps.innerHTML = `${html}<li class="next"><span></span><span class="step__note">${esc(st.text)}</span></li>`;
  }

  // ------------------------------------------------------------------ detail panel

  private zoneLine(key: ZoneKey): string {
    const people = this.peopleIn(key);
    return people.length ? `${people.length} here now` : 'Nobody here now';
  }

  private peopleIn(key: ZoneKey): { key: string; label: string; activity: string; color: string }[] {
    const z = this.data.zones[key];
    if (!z) return [];
    const out: { key: string; label: string; activity: string; color: string }[] = [];
    for (const [k, f] of this.figures) {
      const s = f.state;
      if (!s || !f.root.visible || !inRect(z.rect, s.x, s.y)) continue;
      const pv = this.visit(k);
      out.push({
        key: k,
        label: pv ? `${pv.visit.id} · ${pv.spec.label}` : STAFF[k as StaffKey].label,
        activity: s.activity,
        color: pv ? pv.spec.ring : '#1C1B19',
      });
    }
    return out;
  }

  private renderDetail(t: number) {
    const sel = this.selection;
    const close = `<button type="button" class="detail__close" data-close aria-label="Close"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg></button>`;
    let html = '';
    if (sel?.kind === 'visit') {
      const pv = this.visit(sel.id);
      if (pv) html = close + this.visitDetail(pv, t);
    } else if (sel?.kind === 'zone') {
      html = close + this.zoneDetail(sel.key);
    } else if (sel?.kind === 'staff') {
      html = close + this.staffDetail(sel.key, t);
    }
    if (!html) html = this.storeDetail(t);
    if (this.el.right.innerHTML !== html) this.el.right.innerHTML = html;
  }

  private storeDetail(t: number): string {
    const W = this.data.width;
    const D = this.data.depth;
    const team = (Object.keys(STAFF) as StaffKey[])
      .map((k) => {
        const s = this.day.staff[k].sample(t);
        return `<li><span class="type-dot" style="--c:#1C1B19"></span><button type="button" data-staff="${k}">${esc(STAFF[k].label)}</button><span class="mono">${esc(s?.activity ?? '')}</span></li>`;
      })
      .join('');
    const fee = (i: number) => {
      const b = bands[i]!;
      return `<li><span>${esc(BAND_LABEL[b.id])}</span><span class="mono">${rm(b.fee)}</span></li>`;
    };
    return `
      <header class="detail__head">
        <div class="detail__kicker"><span class="label">Store</span></div>
        <h2 class="detail__title">${STORE.name} · ${this.setting === 'mall' ? 'Mall unit' : 'Petaling Jaya'}</h2>
        <p class="detail__lede">${esc(SETTINGS[this.setting].label)}. Click a zone, a person or a booking to see it here.</p>
      </header>
      <section class="detail__section">
        <dl class="facts">
          <div><dt>Floor</dt><dd class="big">${(W * D).toFixed(0)} m²</dd></div>
          <div><dt>Plan</dt><dd>${W} × ${D} m · placeholder</dd></div>
          <div><dt>Open</dt><dd>${STORE.hours}</dd></div>
          <div><dt>Members</dt><dd>${STORE.members} places</dd></div>
        </dl>
      </section>
      <section class="detail__section">
        <h3 class="label">Team now</h3>
        <ul class="list">${team}</ul>
      </section>
      <section class="detail__section">
        <h3 class="label">Consult fees · by property price</h3>
        <ul class="fees">${bands.map((_, i) => fee(i)).join('')}</ul>
        <p class="kpi__sub">Urgent video +50%. Pre-signing review half price. Members: Lounge free.</p>
      </section>`;
  }

  private visitDetail(pv: PlannedVisit, t: number): string {
    const v = pv.visit;
    const st = status(pv, t);
    const staff = pv.staff ? STAFF[pv.staff].label : '—';
    const where = pv.room === 'booth' ? 'Booth · video' : pv.room ? ROOMS[pv.room].label : v.type === 'member' ? 'Lounge' : '—';
    const log = pv.spec.steps
      .map(([m, label]) => {
        const at = pv.at[m];
        const when = at === undefined ? '—' : at < -600 ? 'yesterday' : clock(at);
        return `<li><span class="type-dot" style="--c:${at !== undefined && at <= t ? pv.spec.ring : 'rgba(28,27,25,0.25)'}"></span><span>${esc(label)}</span><span class="mono">${when}</span></li>`;
      })
      .join('');
    const extra =
      v.type === 'urgent'
        ? `<p class="kpi__sub">${pv.promiseMet ? 'Called back within the two-hour promise.' : 'Outside the two-hour promise.'}</p>`
        : pv.deferred
          ? '<p class="kpi__sub">No room before the 45-minute limit: kopi in the Lounge and a slot booked for later.</p>'
          : '';
    return `
      <header class="detail__head">
        <div class="detail__kicker"><span class="type-dot" style="--c:${pv.spec.ring}"></span><span class="label">${esc(pv.spec.label)} · ${esc(v.id)}</span>${v.added ? '<span class="added">ADDED</span>' : ''}</div>
        <h2 class="detail__title">${esc(v.note)}</h2>
        <p class="detail__lede">${esc(st.text)}</p>
      </header>
      <section class="detail__section">
        <dl class="facts">
          <div><dt>Fee</dt><dd class="big">${pv.fee ? rm(pv.fee) : 'Member'}</dd></div>
          <div><dt>Property</dt><dd>${esc(BAND_LABEL[v.band])}</dd></div>
          <div><dt>Where</dt><dd>${esc(where)}</dd></div>
          <div><dt>With</dt><dd>${esc(staff)}</dd></div>
        </dl>
        ${extra}
      </section>
      <section class="detail__section">
        <h3 class="label">Visit</h3>
        <ul class="list">${log}</ul>
      </section>
      <section class="detail__section">
        <p class="kpi__sub" style="margin:0 0 10px">${esc(pv.spec.blurb)}</p>
        <div class="actions">
          ${pv.track ? `<button type="button" class="btn" data-follow aria-pressed="${this.follow}">Follow in 3D</button>` : ''}
        </div>
      </section>`;
  }

  private zoneDetail(key: ZoneKey): string {
    const z = ZONES[key];
    const people = this.peopleIn(key);
    const role = key === 'private' ? privateRole(this.setting) : z.role;
    const now = people.length
      ? people
          .map((p) => `<li><span class="type-dot" style="--c:${p.color}"></span><button type="button" data-person="${esc(p.key)}">${esc(p.label)}</button><span class="mono">${esc(p.activity)}</span></li>`)
          .join('')
      : '<li><span></span><span class="muted">Nobody here now</span><span></span></li>';
    const seated = key === 'lounge' ? everyoneSeatedIn(this.day, this.t, 'lounge') : null;
    return `
      <header class="detail__head">
        <div class="detail__kicker"><span class="label">Zone</span></div>
        <h2 class="detail__title">${esc(z.name)}</h2>
        <p class="detail__lede">${esc(role)}</p>
      </header>
      ${seated !== null ? `<section class="detail__section"><dl class="facts"><div><dt>Seats taken</dt><dd class="big">${seated} / ${z.seats}</dd></div><div><dt>Kopi of the day</dt><dd>Kopi Tarik · Ipoh beans</dd></div></dl></section>` : ''}
      <section class="detail__section">
        <h3 class="label">Here now</h3>
        <ul class="list">${now}</ul>
      </section>
      <section class="detail__section">
        <h3 class="label">Fit-out</h3>
        <ul class="list list--plain">${z.fitout.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </section>`;
  }

  private staffDetail(key: StaffKey, t: number): string {
    const s = this.day.staff[key].sample(t);
    const duties = this.day.duties[key];
    const list = duties.length
      ? duties
          .map((d) => {
            const cls = d.t1 <= t ? 'muted' : '';
            return `<li><span class="type-dot" style="--c:${t >= d.t0 && t < d.t1 ? '#8C6A43' : 'rgba(28,27,25,0.3)'}"></span><span class="${cls}">${esc(d.label)}</span><span class="mono">${clock(d.t0)}–${clock(d.t1)}</span></li>`;
          })
          .join('')
      : '<li><span></span><span class="muted">No errands today</span><span></span></li>';
    return `
      <header class="detail__head">
        <div class="detail__kicker"><span class="label">Team</span></div>
        <h2 class="detail__title">${esc(STAFF[key].label)}</h2>
        <p class="detail__lede">${esc(s?.activity ?? '')}</p>
      </header>
      <section class="detail__section">
        <div class="actions"><button type="button" class="btn" data-follow aria-pressed="${this.follow}">Follow in 3D</button></div>
      </section>
      <section class="detail__section">
        <h3 class="label">Today · ${duties.length} errands</h3>
        <ul class="list">${list}</ul>
      </section>`;
  }

  private onDetailClick(e: Event) {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]')) return this.select(null);
    const follow = t.closest<HTMLButtonElement>('[data-follow]');
    if (follow) {
      this.follow = !this.follow;
      follow.setAttribute('aria-pressed', String(this.follow));
      return;
    }
    const person = t.closest<HTMLElement>('[data-person]');
    if (person) {
      const k = person.dataset.person!;
      return this.select(k in STAFF ? { kind: 'staff', key: k as StaffKey } : { kind: 'visit', id: k }, true);
    }
    const staff = t.closest<HTMLElement>('[data-staff]');
    if (staff) this.select({ kind: 'staff', key: staff.dataset.staff as StaffKey });
  }
}

function everyoneSeatedIn(day: DayPlan, t: number, zone: ZoneKey): number {
  let n = 0;
  for (const pv of day.visits) {
    const s = pv.track?.sample(t);
    if (s && s.zone === zone && s.sit > 0.5) n++;
  }
  return n;
}
