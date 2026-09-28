/** Group digits with commas: 1199 → "1,199". Same output at build time and in every browser. */
export function groupDigits(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const formatRM = (n: number) => `RM ${groupDigits(n)}`;

/** Longest value the calculator accepts: RM 999,999,999. */
export const MAX_DIGITS = 9;

/** Keep digits only, drop leading zeros, cap length. */
export function cleanDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
}

/**
 * Reformat a typed value and work out where the caret should land, so editing
 * in the middle of "1,250,000" does not throw the caret to the end.
 */
export function reformat(raw: string, caret: number): { value: string; caret: number; digits: string } {
  const digitsBeforeCaret = cleanDigits(raw.slice(0, caret)).length;
  const digits = cleanDigits(raw);
  const value = groupDigits(digits);
  let seen = 0;
  let pos = 0;
  while (pos < value.length && seen < digitsBeforeCaret) {
    if (/\d/.test(value[pos]!)) seen++;
    pos++;
  }
  return { value, caret: pos, digits };
}
