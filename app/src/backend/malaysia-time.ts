/**
 * Advisers publish times in Malaysia time (UTC+8, no daylight saving), whatever the
 * phone's own time zone is.
 */
const OFFSET_MS = 8 * 3_600_000;

/** "2026-10-08" + "15:30" in Malaysia time → ISO instant. Throws on an invalid date or time. */
export function malaysiaInstant(day: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Use YYYY-MM-DD and HH:MM.');
  const date = new Date(`${day}T${time}:00+08:00`);
  // Round-trip to catch dates like 30 February that Date would roll over.
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16) !== `${day}T${time}`) {
    throw new Error('Not a valid date and time.');
  }
  return date.toISOString();
}

/** The Malaysia calendar day of an instant, as YYYY-MM-DD. */
export const malaysiaDay = (iso: string | Date) =>
  new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** The Malaysia clock time of an instant, as HH:MM. */
export const malaysiaClock = (iso: string | Date) =>
  new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(11, 16);

/** The next n Malaysia calendar days, starting today. */
export function nextMalaysiaDays(n: number, now = Date.now()): string[] {
  return Array.from({ length: n }, (_, i) => malaysiaDay(new Date(now + i * 86_400_000)));
}
