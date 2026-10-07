/** Errors from either data source, as keys into t.errors. */
export type ErrorKey =
  | 'offline'
  | 'slotTaken'
  | 'feeChanged'
  | 'tooMany'
  | 'overlap'
  | 'urgentClosed'
  | 'notOpen'
  | 'reviewNeeds'
  | 'generic';

/**
 * Which message to show for an error. Database functions raise plain English
 * sentences (supabase/migrations); the app shows its own words in the client's
 * language instead.
 */
export function errorKey(error: unknown): ErrorKey {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : '';
  const rules: [RegExp, ErrorKey][] = [
    [/fetch|network|timeout/i, 'offline'],
    [/no longer available/i, 'slotTaken'],
    [/fee changed|Fees are not yet/i, 'feeChanged'],
    [/at most three/i, 'tooMany'],
    [/overlaps another/i, 'overlap'],
    [/closed right now/i, 'urgentClosed'],
    [/not open yet/i, 'notOpen'],
    [/pre-signing review/i, 'reviewNeeds'],
  ];
  return rules.find(([re]) => re.test(message))?.[1] ?? 'generic';
}
