/**
 * Build-time page renderer. Runs in Node from vite.config.ts; every page ships as
 * finished HTML so the text paints before any script runs.
 */
import { bands } from '@drprop/brand/pricing';
import { roofPath } from '@drprop/brand/pulse';
import { PULSE_LAYOUT, type PulseLayout } from '../config/pulse.ts';
import { site, whatsappUrl } from '../config/site.ts';
import { groupDigits, formatRM } from '../features/money.ts';
import { dicts, fmt, langMeta, langs, type Dict, type Lang } from '../i18n/index.ts';

export type PageId = 'home' | 'privacy';

export interface PageEntry {
  /** HTML shell path relative to the web root. */
  file: string;
  lang: Lang;
  page: PageId;
}

const pagePath = (lang: Lang, page: PageId) =>
  langMeta[lang].base + (page === 'privacy' ? 'privacy/' : '');

export const pages: PageEntry[] = langs.flatMap((lang) =>
  (['home', 'privacy'] as const).map((page) => ({
    lang,
    page,
    file: `${pagePath(lang, page).slice(1)}index.html`,
  })),
);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------- pieces */

function head(t: Dict, lang: Lang, page: PageId): string {
  const title = page === 'home' ? t.meta.title : t.meta.privacyTitle;
  const alternates = site.origin
    ? [
        `<link rel="canonical" href="${site.origin}${pagePath(lang, page)}">`,
        ...langs.map(
          (l) => `<link rel="alternate" hreflang="${langMeta[l].html}" href="${site.origin}${pagePath(l, page)}">`,
        ),
        `<link rel="alternate" hreflang="x-default" href="${site.origin}${pagePath('en', page)}">`,
      ].join('\n    ')
    : '';
  return `<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(t.meta.description)}">
    <meta name="theme-color" content="#F4F1EA">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(t.meta.description)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.add('motion')</script>
    ${alternates}
    <link rel="stylesheet" href="/src/styles/main.css">${lang === 'zh' ? '\n    <link rel="stylesheet" href="/src/styles/cjk.css">' : ''}
    <script type="module" src="/src/main.ts"></script>
  </head>`;
}

function header(t: Dict, lang: Lang, page: PageId, logoSvg: string): string {
  const langLinks = langs
    .map((l) => {
      const m = langMeta[l];
      const current = l === lang ? ' aria-current="true"' : '';
      return `<a href="${pagePath(l, page)}" hreflang="${m.html}" lang="${m.html}" title="${esc(m.name)}"${current}>${m.short}</a>`;
    })
    .join('');
  return `<header class="site-header">
    <div class="wrap site-header__inner">
      <a class="brand" href="${langMeta[lang].base}" aria-label="${esc(t.a11y.home)}">${logoSvg}</a>
      <nav class="langs" aria-label="${esc(t.a11y.languages)}">${langLinks}</nav>
      <a class="cta" data-cta href="${esc(whatsappUrl(t.cta.message))}"
         data-message="${esc(t.cta.message)}" data-message-fee="${esc(t.cta.messageWithFee)}"
         target="_blank" rel="noopener" aria-label="${esc(t.cta.label)}"><span class="cta__full">${esc(t.cta.label)}</span><span class="cta__short">${esc(t.cta.short)}</span></a>
    </div>
  </header>`;
}

/** Static Pulse Roof. Doubles as the no-WebGL / reduced-motion fallback (brief §7.4). */
function pulse(): string {
  const attrs = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" vector-effect="non-scaling-stroke"';
  const svg = (l: PulseLayout) => {
    const [w, h] = l.viewBox;
    const d = roofPath({ width: w, height: l.height, baseline: l.baseline }, l.roof);
    return `<svg class="pulse__${l.variant}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-pulse-svg="${l.variant}"><path d="${d}" ${attrs}/></svg>`;
  };
  return `<div class="pulse" aria-hidden="true">
      ${svg(PULSE_LAYOUT.wide)}
      ${svg(PULSE_LAYOUT.narrow)}
    </div>`;
}

function hero(t: Dict): string {
  return `<section class="hero" aria-labelledby="hero-title">
    ${pulse()}
    <div class="wrap hero__inner">
      <h1 id="hero-title" class="display hero__title">${esc(t.hero.title)}</h1>
      <p class="hero__sub">${esc(t.hero.sub)}</p>
    </div>
  </section>`;
}

function consults(t: Dict): string {
  const items = t.consults.items
    .map(
      (item, i) => `<li class="consult">
          <h3 class="display consult__head"><span class="consult__no">${pad2(i + 1)}</span><span class="consult__name">${esc(item.name)}</span></h3>
          <p class="consult__text">${esc(item.text)}</p>
          <p class="consult__fee small">${esc(item.fee)}</p>
        </li>`,
    )
    .join('\n        ');
  return `<section class="section" aria-labelledby="consults-label">
    <div class="wrap grid">
      <h2 class="label" id="consults-label">${esc(t.consults.label)}</h2>
      <ol class="section__body consults">
        ${items}
      </ol>
    </div>
  </section>`;
}

function feeCalculator(t: Dict): string {
  const rows = bands
    .map((b, i) => {
      const prev = bands[i - 1];
      const range =
        b.upTo === null
          ? `${t.fee.above} RM ${groupDigits(prev?.upTo ?? 0)}`
          : prev
            ? `RM ${groupDigits(prev.upTo! + 1)} – ${groupDigits(b.upTo)}`
            : `${t.fee.upTo} RM ${groupDigits(b.upTo)}`;
      return `<tr data-band="${b.id}"><th scope="row">${esc(range)}</th><td class="num">${formatRM(b.fee)}</td></tr>`;
    })
    .join('\n            ');
  return `<section class="section" id="fee" aria-labelledby="fee-label">
    <div class="wrap grid">
      <h2 class="label" id="fee-label">${esc(t.fee.label)}</h2>
      <div class="section__body fee">
        <p class="fee__intro">${esc(t.fee.intro)}</p>
        <div class="calc" data-calc>
          <label class="calc__label small" for="property-value">${esc(t.fee.inputLabel)}</label>
          <div class="calc__field num">
            <span class="calc__prefix" aria-hidden="true">RM</span>
            <input class="calc__input" id="property-value" type="text" inputmode="numeric"
                   autocomplete="off" spellcheck="false" enterkeyhint="done"
                   placeholder="${esc(t.fee.placeholder)}" aria-describedby="fee-note">
          </div>
          <p class="calc__label small" id="fee-result-label">${esc(t.fee.resultLabel)}</p>
          <output class="calc__result num" for="property-value" aria-labelledby="fee-result-label" aria-live="polite"><span class="calc__prefix">RM</span> <span class="calc__fee" data-fee>—</span></output>
        </div>
        <p class="fee__note" id="fee-note">${esc(t.fee.note)}</p>
        <table class="bands">
          <caption class="small">${esc(t.fee.tableCaption)}</caption>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p class="fee__rules small">${esc(t.fee.rules)}</p>
      </div>
    </div>
  </section>`;
}

/** Line drawing of the apothecary snack wall — stands in for the store photo (brief §4.3). */
function apothecary(): string {
  const labels = [
    'Kopi Tarik', 'Kopi-O Kosong', 'Teh Tarik',
    'Kuih Seri Muka', 'Kuih Lapis', 'Ondeh-Ondeh',
    'Kaya Toast', 'Pandan Chiffon', 'Tau Sar Pneah',
    'Barley Ais', 'Milo Ais', 'Pineapple Tart',
  ];
  const cols = 3;
  const x0 = 40, y0 = 60, w = 100, h = 84, gap = 10;
  const drawers = labels
    .map((name, i) => {
      const x = x0 + (i % cols) * (w + gap);
      const y = y0 + Math.floor(i / cols) * (h + gap);
      return `<g>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" class="ap-line"/>
          <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="26" class="ap-card"/>
          <text x="${x + w / 2}" y="${y + 27}" class="ap-rx">Rx</text>
          <text x="${x + w / 2}" y="${y + 37}" class="ap-name">${name}</text>
          <line x1="${x + w / 2 - 10}" y1="${y + 62}" x2="${x + w / 2 + 10}" y2="${y + 62}" class="ap-line"/>
        </g>`;
    })
    .join('');
  const width = x0 * 2 + cols * w + (cols - 1) * gap;
  const bottom = y0 + 4 * (h + gap) - gap;
  return `<svg class="apothecary" viewBox="0 0 ${width} ${bottom + 70}" aria-hidden="true">
        <line x1="0" y1="${bottom + 50}" x2="${width}" y2="${bottom + 50}" class="ap-line"/>
        <rect x="${x0 - 14}" y="${y0 - 34}" width="${width - 2 * x0 + 28}" height="${bottom - y0 + 48 + 34}" class="ap-line"/>
        <line x1="${x0 - 14}" y1="${y0 - 14}" x2="${width - x0 + 14}" y2="${y0 - 14}" class="ap-line"/>
        <line x1="${x0 - 4}" y1="${bottom + 14}" x2="${x0 - 4}" y2="${bottom + 50}" class="ap-line"/>
        <line x1="${width - x0 + 4}" y1="${bottom + 14}" x2="${width - x0 + 4}" y2="${bottom + 50}" class="ap-line"/>
        ${drawers}
      </svg>`;
}

function lounge(t: Dict): string {
  const { memberCap, memberPlacesLeft } = site.store;
  const places =
    fmt(t.lounge.cap, { cap: memberCap }) +
    (memberPlacesLeft === null ? '' : ` ${fmt(t.lounge.left, { left: memberPlacesLeft })}`);
  return `<section class="section" aria-labelledby="lounge-title">
    <div class="wrap grid">
      <p class="label" aria-hidden="true">${esc(t.lounge.label)}</p>
      <figure class="lounge__figure">
        ${apothecary()}
        <figcaption class="small">${esc(t.lounge.figure)}</figcaption>
      </figure>
      <div class="lounge__text">
        <h2 class="display" id="lounge-title">${esc(t.lounge.title)}</h2>
        <p>${esc(t.lounge.text)}</p>
        <p>${esc(t.lounge.promise)}</p>
        <p class="small lounge__places">${esc(places)}</p>
      </div>
    </div>
  </section>`;
}

function visit(t: Dict): string {
  const { city, address, mapsUrl, opens, closes } = site.store;
  return `<section class="section" aria-labelledby="visit-label">
    <div class="wrap grid">
      <h2 class="label" id="visit-label">${esc(t.visit.label)}</h2>
      <div class="section__body visit">
        <p class="display visit__city">${esc(city)}</p>
        <div class="visit__details">
          <p>${esc(address)}</p>
          <p>${esc(t.visit.days)} <span class="num">${opens}–${closes}</span><br>${esc(t.visit.closed)}</p>
          <p><a class="link" href="${esc(mapsUrl)}" target="_blank" rel="noopener">${esc(t.visit.map)}</a></p>
        </div>
      </div>
    </div>
  </section>`;
}

function footer(t: Dict, lang: Lang): string {
  return `<footer class="site-footer">
    <div class="wrap grid">
      <p class="site-footer__disclaimer small">${esc(t.footer.disclaimer)}</p>
      <p class="site-footer__meta small">
        <span class="num">${esc(site.ssm)}</span>
        <a class="link" href="${pagePath(lang, 'privacy')}">${esc(t.footer.privacy)}</a>
        <span>© <span class="num">${new Date().getFullYear()}</span> Dr Prop</span>
      </p>
    </div>
  </footer>`;
}

function privacy(t: Dict, lang: Lang): string {
  return `<section class="section section--first" aria-labelledby="privacy-title">
    <div class="wrap grid">
      <div class="section__body prose">
        <h1 class="display" id="privacy-title">${esc(t.privacy.title)}</h1>
        ${t.privacy.body.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <p><a class="link" href="${langMeta[lang].base}">${esc(t.privacy.back)}</a></p>
      </div>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- document */

export function renderDocument(entry: Pick<PageEntry, 'lang' | 'page'>, logoSvg: string): string {
  const { lang, page } = entry;
  const t = dicts[lang];
  const body =
    page === 'home'
      ? [hero(t), consults(t), feeCalculator(t), lounge(t), visit(t)].join('\n  ')
      : privacy(t, lang);
  return `<!doctype html>
<html lang="${langMeta[lang].html}">
  ${head(t, lang, page)}
  <body>
  <a class="skip" href="#main">${esc(t.a11y.skip)}</a>
  ${header(t, lang, page, logoSvg)}
  <main id="main">
  ${body}
  </main>
  ${footer(t, lang)}
  </body>
</html>
`;
}
