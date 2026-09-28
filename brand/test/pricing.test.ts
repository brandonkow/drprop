import { describe, expect, it } from 'vitest';
import { bandFor, bands, consultFee, feeFor } from '../pricing.ts';

describe('feeFor', () => {
  it.each([
    [1, 199],
    [250_000, 199],
    [300_000, 199],
    [300_001, 399],
    [600_000, 399],
    [600_001, 699],
    [1_000_000, 699],
    [1_000_001, 1_199],
    [2_000_000, 1_199],
    [2_000_001, 1_999],
    [50_000_000, 1_999],
  ])('RM %i → RM %i', (value, fee) => {
    expect(feeFor(value)).toBe(fee);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (value) => {
    expect(bandFor(value)).toBeNull();
  });

  it('bands are ascending and only the last is open-ended', () => {
    const bounds = bands.map((b) => b.upTo);
    expect(bounds.at(-1)).toBeNull();
    const closed = bounds.slice(0, -1) as number[];
    expect(closed).toEqual([...closed].sort((a, b) => a - b));
  });
});

describe('consultFee', () => {
  it('charges the band fee for a clinic consult', () => {
    expect(consultFee('clinic', '300k-600k')).toBe(399);
  });
  it('adds 50% for urgent, rounded up to whole ringgit', () => {
    expect(consultFee('urgent', 'lt300k')).toBe(299);
    expect(consultFee('urgent', 'gt2m')).toBe(2999);
  });
  it('halves the fee for a review, rounded up', () => {
    expect(consultFee('review', 'lt300k')).toBe(100);
    expect(consultFee('review', '1m-2m')).toBe(600);
  });
});
