import en from './en.json' with { type: 'json' };
import ms from './ms.json' with { type: 'json' };
import zh from './zh.json' with { type: 'json' };

/** English is the source dictionary; the others must match its shape. */
export type Dict = typeof en;

export const langs = ['en', 'zh', 'ms'] as const;
export type Lang = (typeof langs)[number];

export const dicts: Record<Lang, Dict> = { en, zh, ms };

/** `locale` is for dates and og:locale. */
export const langMeta: Record<Lang, { html: string; short: string; name: string; base: string; locale: string }> = {
  en: { html: 'en', short: 'EN', name: 'English', base: '/', locale: 'en_MY' },
  zh: { html: 'zh-Hans', short: '中', name: '中文', base: '/zh/', locale: 'zh_MY' },
  ms: { html: 'ms', short: 'BM', name: 'Bahasa Melayu', base: '/ms/', locale: 'ms_MY' },
};

/** Replace {key} placeholders. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
