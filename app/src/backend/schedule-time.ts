export function parseMalaysiaSlot(value: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new Error('Use YYYY-MM-DD HH:MM in Malaysia time.');
  const date = new Date(value.replace(' ', 'T') + ':00+08:00');
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16) !== value.replace(' ', 'T')) throw new Error('Enter a valid calendar date and time.');
  return date.toISOString();
}
