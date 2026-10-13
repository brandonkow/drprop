import { malaysiaDay, nextMalaysiaDays } from './malaysia-time';

export interface CalendarSettings {
  opensAt: string;
  closesAt: string;
  closedIsodow: number | null;
  bookingDays: number;
}
export const previewCalendar: CalendarSettings = { opensAt: '10:00', closesAt: '20:00', closedIsodow: 1, bookingDays: 90 };
export function calendarDays(settings: CalendarSettings, now = Date.now()): string[] {
  return nextMalaysiaDays(settings.bookingDays + 1, now).filter((day) => {
    const dow = new Date(`${day}T12:00:00+08:00`).getUTCDay() || 7;
    return dow !== settings.closedIsodow;
  });
}
export function calendarTimes(settings: CalendarSettings): string[] {
  const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const times: string[] = [];
  for (let m = minutes(settings.opensAt); m + 30 <= minutes(settings.closesAt); m += 30) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return times;
}
/** Customer day choices come from available slots, including the full server horizon. */
export function slotDays(slots: { at: string }[]): Date[] {
  return [...new Set(slots.map((s) => malaysiaDay(s.at)))].sort().map((d) => new Date(`${d}T12:00:00+08:00`));
}
export const membershipStatus = (status: string, renewsAt: string, now = new Date()) =>
  status === 'active' && renewsAt <= malaysiaDay(now) ? 'expired' : status;
