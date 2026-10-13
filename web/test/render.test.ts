import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { launchProblems, site } from '../src/config/site.ts';
import { langs } from '../src/i18n/index.ts';
import { ogImagePath, pages, renderDocument } from '../src/render/page.ts';

const html = (entry: (typeof pages)[number]) => renderDocument(entry, '<svg></svg>');

describe('rendered pages', () => {
  it('renders home, privacy and terms in English only', () => {
    expect(pages.map((p) => p.file).sort()).toEqual([
      'index.html',
      'privacy/index.html',
      'terms/index.html',
    ]);
  });

  it.each(pages)('$file links to privacy and terms in its own language', (entry) => {
    const base = entry.lang === 'en' ? '/' : `/${entry.lang}/`;
    const out = html(entry);
    expect(out).toContain(`href="${base}privacy/"`);
    expect(out).toContain(`href="${base}terms/"`);
  });

  it.each(pages.filter((p) => p.page === 'terms'))('$file states the commission and referral-fee promises', (entry) => {
    const out = html(entry);
    const promise = { en: /no commission[\s\S]*no referral fees/i, zh: /不从任何交易中收取佣金[\s\S]*不收转介费/, ms: /tidak mengambil komisen[\s\S]*tidak mengambil yuran rujukan/ }[entry.lang];
    expect(out).toMatch(promise);
    expect(out).toMatch(/2026/);
  });

  it('shows the Lounge image as WebP with a JPEG fallback, and labels it as a concept', () => {
    const out = html(pages.find((p) => p.file === 'index.html')!);
    expect(out).toMatch(/<source type="image\/webp" srcset="\/store\/lounge-800\.webp 800w, \/store\/lounge-1600\.webp 1600w"/);
    expect(out).toMatch(/<img class="lounge__photo" src="\/store\/lounge-1600\.jpg"[^>]+width="1600" height="1067"/);
    expect(out).toContain('A concept rendering of the Lounge.');
  });

  it('publishes no share image or business details until the real origin is set', () => {
    for (const entry of pages) {
      const out = html(entry);
      expect(out).not.toContain('og:image');
      expect(out).not.toContain('application/ld+json');
    }
  });

  it.each(pages)('$file disables booking in preview, including without JavaScript', (entry) => {
    const out = html(entry);
    const ctas = out.match(/class="cta"/g) ?? [];
    expect(ctas).toHaveLength(1);
    expect(out).toContain('data-cta role="link" aria-disabled="true"');
    expect(out).not.toContain('https://wa.me/');
    expect(out).toContain('noindex,nofollow');
  });

  it.each(pages.filter((p) => p.page === 'home'))('$file has exactly the five sections', (entry) => {
    expect(html(entry).match(/<section /g)).toHaveLength(5);
  });

  it('sets the html lang per language', () => {
    const langOf = (file: string) => html(pages.find((p) => p.file === file)!).match(/<html lang="([^"]+)"/)?.[1];
    expect(langOf('index.html')).toBe('en');
    expect(html(pages[0]!)).not.toContain('class="langs"');
  });

  it('only the Chinese pages load the CJK font stylesheet', () => {
    for (const entry of pages) {
      expect(html(entry).includes('cjk.generated.css')).toBe(entry.lang === 'zh');
    }
  });

  it('does not show an invented member count', () => {
    const out = html(pages.find((p) => p.file === 'index.html')!);
    expect(out).toContain('300 member places');
    expect(out).not.toContain('remaining');
  });

  it('lists every placeholder that blocks a launch build, and none for real details', () => {
    // The invariant: a launch config (origin set) has no placeholders.
    if (site.origin) expect(launchProblems()).toEqual([]);
    expect(
      launchProblems({
        whatsapp: '60XXXXXXXXX',
        ssm: 'SSM 000000000000 (0000000-X)',
        store: { address: 'Jalan —, 46000 Petaling Jaya', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Petaling+Jaya' },
      }),
    ).toHaveLength(5);
    expect(
      launchProblems({
        origin: 'https://example.com',
        whatsapp: '60123456789',
        ssm: 'SSM 202601012345 (1234567-A)',
        store: { address: '12 Jalan SS 2/24, 47300 Petaling Jaya, Selangor', mapsUrl: 'https://maps.app.goo.gl/AbCdEf' },
      }),
    ).toEqual([]);
  });

  it.each(langs)('has a share card for %s (og:image once the origin is set)', (lang) => {
    expect(existsSync(new URL(`../public${ogImagePath(lang)}`, import.meta.url))).toBe(true);
  });

  it.each(pages.filter((p) => p.page === 'home'))('$file links the sample diagnosis in its language, and the file exists', (entry) => {
    const href = html(entry).match(/href="(\/samples\/diagnosis-\w+\.pdf)"/)?.[1];
    expect(href).toBe(`/samples/diagnosis-${entry.lang}.pdf`);
    expect(existsSync(new URL(`../public${href}`, import.meta.url))).toBe(true);
  });
});
