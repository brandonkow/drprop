import { describe, expect, it } from 'vitest';
import { bandFor, bands, feeFor } from '../pricing.ts';

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
