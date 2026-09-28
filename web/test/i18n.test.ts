import { describe, expect, it } from 'vitest';
import { dicts, fmt, langs } from '../src/i18n/index.ts';

/** Every key path in a dictionary, arrays included by index. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe('dictionaries', () => {
  const reference = keyPaths(dicts.en).sort();

  it.each(langs)('%s has exactly the same keys as en', (lang) => {
    expect(keyPaths(dicts[lang]).sort()).toEqual(reference);
  });

  it.each(langs)('%s has no empty strings', (lang) => {
    const empty = keyPaths(dicts[lang]).filter((path) => {
      const v = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dicts[lang]);
      return typeof v === 'string' && v.trim() === '';
    });
    expect(empty).toEqual([]);
  });

  it('fmt fills placeholders and leaves unknown ones', () => {
    expect(fmt('{a} of {b}', { a: 1 })).toBe('1 of {b}');
  });
});
