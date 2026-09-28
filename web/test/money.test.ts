import { describe, expect, it } from 'vitest';
import { cleanDigits, formatRM, groupDigits, reformat } from '../src/features/money.ts';

describe('money', () => {
  it('groups digits', () => {
    expect(groupDigits(0)).toBe('0');
    expect(groupDigits(999)).toBe('999');
    expect(groupDigits(1199)).toBe('1,199');
    expect(groupDigits('2000000')).toBe('2,000,000');
    expect(formatRM(450000)).toBe('RM 450,000');
  });

  it('cleans typed input', () => {
    expect(cleanDigits('RM 00450,000.50')).toBe('45000050');
    expect(cleanDigits('1234567890123')).toBe('123456789');
    expect(cleanDigits('abc')).toBe('');
  });

  it('keeps the caret after the same digit when reformatting', () => {
    // typed "1" at the start of "500,000"
    expect(reformat('1500,000', 1)).toEqual({ value: '1,500,000', caret: 1, digits: '1500000' });
    // deleted the comma-adjacent digit in "1,250,000" → "1,50,000" with caret at 2
    expect(reformat('1,50,000', 2)).toEqual({ value: '150,000', caret: 1, digits: '150000' });
    // caret at the end stays at the end
    expect(reformat('4500000', 7)).toEqual({ value: '4,500,000', caret: 9, digits: '4500000' });
  });
});
