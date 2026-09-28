import { describe, expect, it } from 'vitest';
import { pages, renderDocument } from '../src/render/page.ts';

const html = (entry: (typeof pages)[number]) => renderDocument(entry, '<svg></svg>');

describe('rendered pages', () => {
  it('renders six pages: home and privacy in three languages', () => {
    expect(pages.map((p) => p.file).sort()).toEqual([
      'index.html',
      'ms/index.html',
      'ms/privacy/index.html',
      'privacy/index.html',
      'zh/index.html',
      'zh/privacy/index.html',
    ]);
  });

  it.each(pages)('$file has exactly one CTA and it goes to WhatsApp', (entry) => {
    const out = html(entry);
    const ctas = out.match(/class="cta"/g) ?? [];
    expect(ctas).toHaveLength(1);
    expect(out).toMatch(/class="cta" data-cta href="https:\/\/wa\.me\//);
  });

  it.each(pages.filter((p) => p.page === 'home'))('$file has exactly the five sections', (entry) => {
    expect(html(entry).match(/<section /g)).toHaveLength(5);
  });

  it('sets the html lang per language', () => {
    const langOf = (file: string) => html(pages.find((p) => p.file === file)!).match(/<html lang="([^"]+)"/)?.[1];
    expect(langOf('index.html')).toBe('en');
    expect(langOf('zh/index.html')).toBe('zh-Hans');
    expect(langOf('ms/index.html')).toBe('ms');
  });

  it('only the Chinese pages load the CJK font stylesheet', () => {
    for (const entry of pages) {
      expect(html(entry).includes('cjk.css')).toBe(entry.lang === 'zh');
    }
  });

  it('does not show an invented member count', () => {
    const out = html(pages.find((p) => p.file === 'index.html')!);
    expect(out).toContain('300 member places');
    expect(out).not.toContain('remaining');
  });
});
