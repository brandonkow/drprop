/**
 * A sample day to watch the store work: every kind of customer, spread from opening at
 * 10:00 to closing at 20:00 (brief §5: Tue–Sun 10:00–20:00, still a placeholder).
 * Illustrative only: booking numbers, cases and member numbers are made up.
 */
import type { PriceBand } from '@drprop/brand/pricing';
import type { CustomerType, Visit } from './types.ts';

const DAY: [number, CustomerType, PriceBand, string][] = [
  [-25, 'urgent', '300k-600k', 'Signing today · condo'],
  [2, 'walkin', '1m-2m', 'First home · terrace'],
  [6, 'member', 'lt300k', 'Member PJ-0127'],
  [12, 'private', 'gt2m', 'Bungalow · private'],
  [20, 'member', 'lt300k', 'Member PJ-0043'],
  [70, 'booked', '300k-600k', 'First home · apartment'],
  [85, 'review', '600k-1m', 'Deposit tomorrow · terrace'],
  [80, 'urgent', '1m-2m', 'Offer expires today · semi-D'],
  [100, 'walkin', 'lt300k', 'Rent or buy? · flat'],
  [120, 'member', 'lt300k', 'Member PJ-0211'],
  [150, 'booked', '600k-1m', 'Investment · serviced apartment'],
  [180, 'private', '1m-2m', 'Second home · private'],
  [210, 'review', '300k-600k', 'Deposit today · condo'],
  [225, 'walkin', '600k-1m', 'Subsale · terrace'],
  [255, 'member', 'lt300k', 'Member PJ-0098'],
  [270, 'booked', 'lt300k', 'First home · flat'],
  [300, 'urgent', 'gt2m', 'Auction tomorrow · bungalow'],
  [330, 'review', '1m-2m', 'Deposit tomorrow · semi-D'],
  [360, 'walkin', '300k-600k', 'New launch · condo'],
  [390, 'member', 'lt300k', 'Member PJ-0164'],
  [420, 'booked', '600k-1m', 'Downsizing · condo'],
  [450, 'private', 'gt2m', 'Portfolio · private'],
  [480, 'member', 'lt300k', 'Member PJ-0230'],
  [495, 'walkin', 'lt300k', 'Rent to own? · flat'],
  [525, 'booked', '1m-2m', 'Upgrading · terrace'],
  [555, 'review', '600k-1m', 'Deposit today · apartment'],
  [570, 'member', 'lt300k', 'Member PJ-0071'],
];

export function sampleDay(): Visit[] {
  return DAY.map(([at, type, band, note], i) => ({ id: `DP-${String(410 + i).padStart(4, '0')}`, type, at, band, note }));
}

/** 10:00 + minutes, as a 24-hour clock. */
export function clock(minutes: number): string {
  const total = Math.floor(10 * 60 + minutes);
  const h = Math.floor(total / 60);
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
