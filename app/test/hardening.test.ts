import { describe, expect, it } from 'vitest';
import { calendarDays, calendarTimes, membershipStatus, previewCalendar, previewDaySlots, slotDays } from '../src/backend/calendar';
import { cardTilt } from '../src/components/card-motion';
import { SessionGuard } from '../src/state/session-guard';
import { formatWhen } from '../src/i18n/format';

describe('existing workflow regressions', () => {
  it('uses MYT across midnight and exposes distant availability', () => {
    const slots = [{ at: '2026-10-11T19:00:00Z' }, { at: '2026-12-01T04:00:00Z' }];
    expect(slotDays(slots).map((d) => d.toISOString())).toEqual(['2026-10-12T04:00:00.000Z', '2026-12-01T04:00:00.000Z']);
    expect(formatWhen(slots[0]!.at, 'en')).toContain('03:00 MYT');
  });
  it('honours changed hours and closed days', () => {
    expect(calendarTimes({ ...previewCalendar, opensAt: '13:15:00', closesAt: '14:15:00' })).toEqual(['13:15', '13:45']);
    expect(calendarDays({ ...previewCalendar, bookingDays: 2 }, Date.parse('2026-10-11T04:00:00Z'))).toEqual(['2026-10-11', '2026-10-13']);
  });
  it('expires membership at Malaysia midnight on its renewal date', () => {
    expect(membershipStatus('active', '2026-10-12', new Date('2026-10-11T15:59:59Z'))).toBe('active');
    expect(membershipStatus('active', '2026-10-12', new Date('2026-10-11T16:00:00Z'))).toBe('expired');
  });
  it('maps native radians to an unclamped card pose', () => {
    expect(cardTilt(Math.PI / 4, 0)).toEqual({ x: 0, y: 0 });
    expect(cardTilt(Math.PI / 3, Math.PI / 18).x).toBeCloseTo(10 / 35);
    expect(cardTilt(Math.PI / 3, Math.PI / 18).y).toBeCloseTo(15 / 35);
    expect(cardTilt(Number.NaN, 0)).toEqual({ x: 0, y: 0 });
  });
  it('discards an in-flight load after sign-out or account switch', async () => {
    const guard = new SessionGuard();
    const before = guard.ticket();
    let resolve!: () => void;
    const work = new Promise<void>((done) => { resolve = done; }).then(() => guard.current(before));
    guard.invalidate(); resolve();
    expect(await work).toBe(false);
    expect(guard.current(guard.ticket())).toBe(true);
  });
});

it('preview slots stay within Malaysia hours even on UTC devices', () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  expect(previewDaySlots('2026-10-13', now)).toEqual([]); // Already 20:00 in Malaysia.
  const tomorrow = previewDaySlots('2026-10-14', now);
  expect(tomorrow).toHaveLength(20);
  expect(tomorrow[0]!.toISOString()).toBe('2026-10-14T02:00:00.000Z');
  expect(tomorrow.at(-1)!.toISOString()).toBe('2026-10-14T11:30:00.000Z');
  expect(previewDaySlots('2026-10-19', now)).toEqual([]); // Monday in Malaysia.
});
