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
 * A full stop starts the sen: "500,000.00" is RM 500,000, not RM 50,000,000.
 * `digits` is the ringgit part; `amount` the value with sen, or null when empty.
 */
export function reformat(
  raw: string,
  caret: number,
): { value: string; caret: number; digits: string; amount: number | null } {
  const dot = raw.indexOf('.');
  const intRaw = dot >= 0 ? raw.slice(0, dot) : raw;
  const fracRaw = dot >= 0 ? raw.slice(dot + 1) : '';
  const digits = cleanDigits(intRaw);
  const sen = fracRaw.replace(/\D/g, '').slice(0, 2);
  const whole = digits || (dot >= 0 ? '0' : '');
  const grouped = groupDigits(whole);
  const value = grouped + (dot >= 0 ? `.${sen}` : '');

  let pos: number;
  if (dot >= 0 && caret > dot) {
    pos = grouped.length + 1 + Math.min(sen.length, fracRaw.slice(0, caret - dot - 1).replace(/\D/g, '').length);
  } else {
    const digitsBeforeCaret = cleanDigits(intRaw.slice(0, caret)).length;
    let seen = 0;
    pos = 0;
    while (pos < grouped.length && seen < digitsBeforeCaret) {
      if (/\d/.test(grouped[pos]!)) seen++;
      pos++;
    }
  }
  const amount = whole ? Number(`${whole}.${sen || '0'}`) : null;
  return { value, caret: pos, digits, amount: amount === 0 ? null : amount };
}
