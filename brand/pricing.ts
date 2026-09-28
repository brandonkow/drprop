/**
 * Consultation fee bands (brief §3.2). Shared by web §3, app S3 and reels R4.
 * Each band includes its upper bound: RM 300,000 exactly is in the first band.
 *
 * Still to be confirmed by the founder (brief §11): final numbers, the urgent
 * surcharge and the review discount. Pages describe those two as rules in words
 * and do not compute them.
 */

export type PriceBand = 'lt300k' | '300k-600k' | '600k-1m' | '1m-2m' | 'gt2m';

export interface Band {
  id: PriceBand;
  /** Inclusive upper bound in RM; null for the capped top band. */
  upTo: number | null;
  /** Fee in RM. */
  fee: number;
}

export const bands: readonly Band[] = [
  { id: 'lt300k', upTo: 300_000, fee: 199 },
  { id: '300k-600k', upTo: 600_000, fee: 399 },
  { id: '600k-1m', upTo: 1_000_000, fee: 699 },
  { id: '1m-2m', upTo: 2_000_000, fee: 1_199 },
  { id: 'gt2m', upTo: null, fee: 1_999 },
];

/** Urgent (same day, video within 2 hours): +50%. */
export const URGENT_SURCHARGE = 0.5;
/** Pre-signing review: half price. */
export const REVIEW_DISCOUNT = 0.5;

/** Band for a property value in RM. Returns null for non-positive or non-finite input. */
export function bandFor(value: number): Band | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return bands.find((b) => b.upTo === null || value <= b.upTo) ?? null;
}

export function feeFor(value: number): number | null {
  return bandFor(value)?.fee ?? null;
}
