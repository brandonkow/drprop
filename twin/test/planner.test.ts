import { describe, expect, it } from 'vitest';
import mallPlan from '../src/data/plan-mall.json';
import shophousePlan from '../src/data/plan-shophouse.json';
import type { PlanData } from '../src/data.ts';
import { sampleDay } from '../src/sim/day.ts';
import { CLOSE, plan } from '../src/sim/planner.ts';
import type { Track } from '../src/sim/track.ts';
import { TYPE_KEYS, type Visit } from '../src/sim/types.ts';

const settings = { shophouse: shophousePlan as unknown as PlanData, mall: mallPlan as unknown as PlanData };

function contiguous(t: Track) {
  for (let i = 1; i < t.segs.length; i++) expect(t.segs[i]!.t0).toBeCloseTo(t.segs[i - 1]!.t1, 6);
}

describe.each(Object.entries(settings))('day plan · %s', (_, data) => {
  const day = plan(data, sampleDay());

  it('serves every kind of customer', () => {
    const kinds = new Set(day.visits.map((v) => v.visit.type));
    for (const k of TYPE_KEYS) expect(kinds.has(k)).toBe(true);
  });

  it('gives every consult a room and a time before closing', () => {
    for (const v of day.visits) {
      if (v.spec.consult === 0 || v.deferred) continue;
      expect(v.at.consult, v.visit.id).toBeTypeOf('number');
      expect(v.at.consult_end! - v.at.consult!).toBeCloseTo(v.spec.consult, 6);
      expect(v.at.consult_end!).toBeLessThan(CLOSE + 10);
      expect(v.room).not.toBeNull();
    }
    // Only walk-ins are ever asked to book a later slot, and never at the opening.
    for (const v of day.visits.filter((x) => x.deferred)) expect(v.visit.type).toBe('walkin');
    expect(day.visits.find((v) => v.visit.type === 'walkin')!.deferred).toBeFalsy();
  });

  it('never books a staff member twice', () => {
    for (const [who, list] of Object.entries(day.duties)) {
      for (let i = 1; i < list.length; i++) expect(list[i]!.t0, who).toBeGreaterThanOrEqual(list[i - 1]!.t1 - 1e-6);
    }
  });

  it('keeps every timeline continuous', () => {
    for (const v of day.visits) if (v.track) contiguous(v.track);
    for (const t of Object.values(day.staff)) contiguous(t);
  });

  it('never seats two people in one place at once', () => {
    const people = [...day.visits.map((v) => v.track), ...Object.values(day.staff)].filter(Boolean) as Track[];
    for (let t = 0; t < CLOSE; t += 0.5) {
      const seated = people.map((p) => p.sample(t)).filter((s) => s && s.sit > 0.5);
      const spots = seated.map((s) => `${s!.x.toFixed(2)},${s!.y.toFixed(2)}`);
      expect(new Set(spots).size, `t=${t}`).toBe(spots.length);
    }
  });

  it('samples cleanly all day', () => {
    for (const v of day.visits) {
      if (!v.track) continue;
      for (let t = v.track.start; t <= v.track.end; t += 0.25) {
        const s = v.track.sample(t);
        if (!s) continue;
        for (const n of [s.x, s.y, s.yaw, s.sit, s.dist]) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it('keeps the two-hour promise for video calls', () => {
    for (const v of day.visits.filter((x) => x.visit.type === 'urgent')) expect(v.promiseMet, v.visit.id).toBe(true);
  });

  it('does not change the past when a visit is added', () => {
    const now = 140;
    const added: Visit = { id: 'DP-9001', type: 'walkin', at: now, band: '600k-1m', note: 'Added', added: true };
    const after = plan(data, [...sampleDay(), added]);
    const before = new Map(day.visits.map((v) => [v.visit.id, v]));
    for (const v of after.visits) {
      const old = before.get(v.visit.id);
      if (!old?.track || !v.track) continue;
      for (let t = 0; t < now; t += 1) expect(v.track.sample(t), `${v.visit.id} t=${t}`).toEqual(old.track.sample(t));
    }
    for (const key of Object.keys(day.staff) as (keyof typeof day.staff)[]) {
      for (let t = 0; t < now; t += 1) expect(after.staff[key].sample(t), `${key} t=${t}`).toEqual(day.staff[key].sample(t));
    }
  });
});
