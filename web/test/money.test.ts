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
    expect(reformat('1500,000', 1)).toEqual({ value: '1,500,000', caret: 1, digits: '1500000', amount: 1500000 });
    // deleted the comma-adjacent digit in "1,250,000" → "1,50,000" with caret at 2
    expect(reformat('1,50,000', 2)).toEqual({ value: '150,000', caret: 1, digits: '150000', amount: 150000 });
    // caret at the end stays at the end
    expect(reformat('4500000', 7)).toEqual({ value: '4,500,000', caret: 9, digits: '4500000', amount: 4500000 });
  });

  it('reads a full stop as the start of the sen, never as more ringgit', () => {
    expect(reformat('500000.00', 9)).toMatchObject({ value: '500,000.00', amount: 500000 });
    expect(reformat('RM 450,000.50', 13)).toMatchObject({ value: '450,000.50', amount: 450000.5 });
    expect(reformat('300000.01', 9)).toMatchObject({ amount: 300000.01 });
    expect(reformat('1.2345', 6)).toMatchObject({ value: '1.23', amount: 1.23 });
    expect(reformat('.5', 2)).toMatchObject({ value: '0.5', amount: 0.5 });
    expect(reformat('', 0)).toMatchObject({ value: '', amount: null });
    expect(reformat('0', 1)).toMatchObject({ amount: null });
  });

  it('keeps the caret in the sen while typing them', () => {
    expect(reformat('1250000.5', 9)).toEqual({ value: '1,250,000.5', caret: 11, digits: '1250000', amount: 1250000.5 });
  });
});
