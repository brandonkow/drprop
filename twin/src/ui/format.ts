import type { PlannedVisit } from '../sim/planner.ts';
import { clock } from '../sim/day.ts';

export const rm = (n: number) => `RM ${Math.round(n).toLocaleString('en-MY')}`;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export type Tone = 'due' | 'live' | 'now' | 'done';

/** One line for the bookings table and the detail panel. */
export function status(pv: PlannedVisit, t: number): { text: string; tone: Tone } {
  const at = pv.at;
  if (pv.visit.type === 'urgent') {
    if (t < at.callback!) return { text: `Call back by ${clock(at.requested! + 120)}`, tone: 'due' };
    if (t < at.consult_end!) return { text: 'On the video call', tone: 'now' };
    if (t < at.diagnosis!) return { text: 'Writing the diagnosis', tone: 'done' };
    return { text: 'Diagnosis sent', tone: 'done' };
  }
  const tr = pv.track!;
  if (t < tr.start) return { text: pv.spec.announced || pv.visit.added ? `Due ${clock(pv.at.arrived ?? pv.visit.at)}` : 'Not here yet', tone: 'due' };
  const s = tr.sample(t);
  if (s) {
    const inConsult = at.consult !== undefined && t >= at.consult && t < at.consult_end!;
    return { text: s.activity, tone: inConsult ? 'now' : 'live' };
  }
  if (pv.deferred) return { text: 'Booked a later slot', tone: 'done' };
  if (at.diagnosis !== undefined) return t < at.diagnosis ? { text: 'Writing the diagnosis', tone: 'done' } : { text: 'Diagnosis sent', tone: 'done' };
  return { text: 'Visited', tone: 'done' };
}

/** Is the visit known to the store at time t (booked ahead, or walked in)? */
export function known(pv: PlannedVisit, t: number): boolean {
  if (pv.spec.announced || pv.visit.added) return true;
  return !!pv.track && t >= pv.track.start;
}

export { clock };
