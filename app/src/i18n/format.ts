import type { Lang } from '../data/types';

const LOCALE: Record<Lang, string> = { en: 'en-MY', zh: 'zh-Hans-MY', ms: 'ms-MY' };

/** RM with thousands separators, e.g. "RM 1,199". */
export const rm = (n: number) => `RM ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export function formatDay(iso: string | Date, lang: Lang): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/** "Thu 3 Oct, 15:00" style, for records and confirmations. */
export const formatWhen = (iso: string, lang: Lang) => `${formatDay(iso, lang)} · ${formatTime(iso)}`;
