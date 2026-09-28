import { priceBands } from '../config/pricing.ts';
export type FeeResult = { state: 'empty' | 'invalid' } | { state: 'valid'; fee: number };
export function calculateFee(raw: string): FeeResult {
  const text = raw.trim();
  if (!text) return { state: 'empty' };
  // Accept ordinary decimals or correctly grouped thousands. Reject exponents,
  // partial strings, negative amounts and more than two decimal places.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return { state: 'invalid' };
  const value = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER / 100) return { state: 'invalid' };
  return { state: 'valid', fee: priceBands.find(band => value <= band.ceiling)!.fee };
}
