/**
 * HTML for the printed pieces, turned into PDFs by brand/scripts/build-print.ts.
 * Plain HTML + CSS with the brand fonts and tokens: no framework, no template engine.
 *
 *   report  A4, two pages: the diagnosis the client receives as a PDF (brief §3.2).
 *   card    A6 landscape, front and back: the letterpress card on thick cotton
 *           stock with the adviser's handwritten line (§4.4). Ink only, no
 *           background: the paper is the colour.
 *   plate   The brass fee plate beside the door (§6.1), 300 × 400 mm.
 */
import { bands, consultFee, type PriceBand } from '../pricing.ts';
import { color } from '../tokens/tokens.ts';
import { CONSULT_NAMES, fee, LABELS, type Diagnosis, type Lang, type RiskLevel, type Whom } from './diagnosis.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const rm = (n: number) => `RM ${group(n)}`;

export const RANGES: Record<PriceBand, string> = {
  lt300k: '≤ RM 300k',
  '300k-600k': 'RM 300k – 600k',
  '600k-1m': 'RM 600k – 1M',
  '1m-2m': 'RM 1M – 2M',
  gt2m: '> RM 2M',
};

const LOCALE: Record<Lang, string> = { en: 'en-GB', zh: 'zh-Hans-MY', ms: 'ms-MY' };
const longDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

/** Font stylesheets, as file URLs resolved by the caller. */
export interface Fonts {
  css: string[];
}

function head(lang: Lang, fonts: Fonts, page: string, extra: string): string {
  const zh = lang === 'zh';
  return `<!doctype html><html lang="${lang === 'zh' ? 'zh-Hans' : lang}"><head><meta charset="utf-8">
${fonts.css.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<style>
  @page { size: ${page}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; color: ${color.ink}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 400 9.5pt/1.5 'Geist', ${zh ? "'Noto Sans SC', " : ''}sans-serif; }
  .serif { font-family: ${zh ? "'Noto Serif SC'" : "'Instrument Serif'"}, serif; font-weight: ${zh ? 300 : 400}; }
  .mono { font-family: 'Geist Mono', monospace; }
  .muted { color: ${color.stoneText}; }
  .label { font-size: 7.5pt; letter-spacing: ${zh ? '0.12em' : '0.08em'}; text-transform: uppercase; color: ${color.stoneText}; }
  ${extra}
</style></head><body>`;
}

/* ------------------------------------------------------------------ report */

const LEVEL_ORDER: RiskLevel[] = ['resolve', 'ask', 'watch'];
const WHOM_ORDER: Whom[] = ['bank', 'lawyer', 'seller', 'neighbours'];

export function reportHtml(d: Diagnosis, lang: Lang, fonts: Fonts, logoSvg: string): string {
  const L = LABELS[lang];
  const zh = lang === 'zh';
  const pageNo = (n: number) => L.page.replace('{n}', String(n)).replace('{of}', '2');
  const footer = (n: number) => `<footer class="foot">
      <p>${esc(L.disclaimer)}</p>
      <p>${esc(L.noCommission)}</p>
      <p class="mono muted">Dr Prop · Petaling Jaya · ${esc(d.recordNo)} · ${esc(pageNo(n))}</p>
    </footer>`;
  const banner = d.sample ? `<p class="sample">${esc(L.sample)}</p>` : '';
  const facts: [string, string][] = [
    [L.client, d.client],
    [L.adviser, d.adviser],
    [L.consult, `${CONSULT_NAMES[lang][d.consult.type]} · ${longDate(d.date, lang)}`],
    [L.fee, `${rm(fee(d))} · ${RANGES[d.consult.band]}`],
    [L.property, d.property.kind],
    [L.tenure, d.property.tenure],
    [L.titleType, d.property.title],
    [L.stage, d.property.stage],
  ];
  const risks = LEVEL_ORDER.flatMap((level) => d.risks.filter((r) => r.level === level));
  const questions = WHOM_ORDER.map((whom) => [whom, d.questions.filter((q) => q.whom === whom)] as const).filter(([, qs]) => qs.length);

  const css = `
    .page { position: relative; width: 210mm; height: 297mm; padding: 14mm 18mm 0; overflow: hidden; page-break-after: always; background: ${color.paper}; }
    .page:last-child { page-break-after: auto; }
    .top { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 5mm; border-bottom: 0.6pt solid ${color.ink}; }
    .top svg { width: 46mm; height: auto; color: ${color.ink}; }
    .top .doc { text-align: right; }
    .top .doc .serif { font-size: 15pt; line-height: 1.1; }
    .sample { margin: 4mm 0 0; padding: 1.6mm 3mm; border: 0.6pt solid ${color.stone}; font-size: 8pt; color: ${color.stoneText}; display: inline-block; }
    h1 { margin: 6mm 0 5mm; font-size: ${zh ? 25 : 30}pt; line-height: 1.08; letter-spacing: ${zh ? '0.02em' : '-0.01em'}; }
    .sub { margin: 0 0 6mm; }
    dl.facts { display: grid; grid-template-columns: 22mm 1fr 22mm 1fr; gap: 1.2mm 5mm; margin: 0 0 5mm; padding: 3.5mm 0; border-top: 0.4pt solid ${color.stone}; border-bottom: 0.4pt solid ${color.stone}; }
    dl.facts dt { font-size: 7.5pt; color: ${color.stoneText}; padding-top: 0.6mm; }
    dl.facts dd { margin: 0; }
    .docs { margin: -2mm 0 4mm; font-size: 8.3pt; }
    h2 { margin: 5mm 0 2mm; }
    .summary { margin: 0; font-size: ${zh ? 12 : 13.5}pt; line-height: 1.38; max-width: 165mm; }
    table.risks { width: 100%; border-collapse: collapse; font-size: 8.3pt; line-height: 1.38; }
    table.risks th { text-align: left; font-weight: 400; font-size: 7.5pt; color: ${color.stoneText}; padding: 0 2.5mm 1.5mm 0; border-bottom: 0.6pt solid ${color.ink}; }
    table.risks td { vertical-align: top; padding: 1.7mm 2.5mm 1.7mm 0; border-bottom: 0.4pt solid ${color.travertine}; }
    table.risks td.level { width: 27mm; font-size: 7.6pt; }
    table.risks tr.resolve td.level { color: ${color.bronze}; }
    table.risks td.area { width: 22mm; }
    table.risks td.basis { width: 25mm; color: ${color.stoneText}; font-size: 7.8pt; }
    .q { margin: 0 0 4mm; }
    .q h3 { margin: 0 0 1.4mm; font-weight: 400; font-size: 8pt; color: ${color.stoneText}; }
    .q ol { margin: 0; padding: 0; list-style: none; }
    .q li { position: relative; padding: 1.4mm 0 1.4mm 9mm; border-bottom: 0.4pt solid ${color.travertine}; font-size: 10pt; }
    .q li::before { content: counter(qn, decimal-leading-zero); counter-increment: qn; position: absolute; left: 0; top: 1.6mm; font-family: 'Geist Mono', monospace; font-size: 8pt; color: ${color.stoneText}; }
    .qs { counter-reset: qn; }
    ul.steps { margin: 0; padding: 0; list-style: none; }
    ul.steps li { display: flex; gap: 4mm; align-items: baseline; padding: 1.8mm 0; border-bottom: 0.4pt solid ${color.travertine}; font-size: 10pt; }
    ul.steps .box { flex: none; width: 3.4mm; height: 3.4mm; border: 0.6pt solid ${color.ink}; transform: translateY(0.4mm); }
    .note { margin: 8mm 0 0; padding: 5mm 0 0; border-top: 0.6pt solid ${color.ink}; }
    .note p.serif { margin: 2mm 0 0; font-size: ${zh ? 14 : 17}pt; line-height: 1.35; max-width: 150mm; }
    .sign { display: flex; gap: 10mm; margin-top: 12mm; }
    .sign div { flex: 1; border-top: 0.4pt solid ${color.stone}; padding-top: 1.5mm; font-size: 7.5pt; color: ${color.stoneText}; }
    .foot { position: absolute; left: 18mm; right: 18mm; bottom: 10mm; padding-top: 3mm; border-top: 0.4pt solid ${color.stone}; font-size: 7.4pt; line-height: 1.45; color: ${color.stoneText}; }
    .foot p { margin: 0 0 0.8mm; }
  `;

  return `${head(lang, fonts, 'A4', css)}
  <section class="page">
    <header class="top">${logoSvg}<div class="doc"><div class="serif">${esc(L.title)}</div><div class="mono muted">${esc(d.recordNo)}</div></div></header>
    ${banner}
    <h1 class="serif">${esc(d.property.label)}</h1>
    <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <p class="docs"><span class="muted">${esc(L.documents)}:</span> ${d.documents.map(esc).join(' · ')}</p>
    <h2 class="label">${esc(L.whatWeSee)}</h2>
    <p class="summary serif">${esc(d.summary)}</p>
    <h2 class="label">${esc(L.risks)}</h2>
    <table class="risks">
      <thead><tr><th></th><th>${esc(L.area)}</th><th>${esc(L.found)}</th><th>${esc(L.why)}</th><th>${esc(L.basis)}</th></tr></thead>
      <tbody>${risks
        .map(
          (r) => `<tr class="${r.level}"><td class="level">${esc(L.levels[r.level])}</td><td class="area">${esc(r.area)}</td><td>${esc(r.found)}</td><td>${esc(r.why)}</td><td class="basis">${esc(r.basis)}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    ${footer(1)}
  </section>
  <section class="page">
    <header class="top">${logoSvg}<div class="doc"><div class="serif">${esc(L.title)}</div><div class="mono muted">${esc(d.recordNo)}</div></div></header>
    <h2 class="label" style="margin-top:8mm">${esc(L.questions)}</h2>
    <div class="qs">${questions
      .map(([whom, qs]) => `<div class="q"><h3>${esc(L.whom[whom])}</h3><ol>${qs.map((q) => `<li>${esc(q.text)}</li>`).join('')}</ol></div>`)
      .join('')}</div>
    <h2 class="label">${esc(L.next)}</h2>
    <ul class="steps">${d.nextSteps.map((s) => `<li><span class="box"></span><span>${esc(s)}</span></li>`).join('')}</ul>
    <div class="note">
      <div class="label">${esc(L.note)}</div>
      <p class="serif">${esc(d.adviserNote)}</p>
    </div>
    <div class="sign"><div>${esc(L.signature)}: ${esc(d.adviser)}</div><div>${esc(L.date)}: ${esc(longDate(d.date, lang))}</div></div>
    ${footer(2)}
  </section>
</body></html>`;
}

/* ------------------------------------------------------------------ card */

export function cardHtml(d: Diagnosis, lang: Lang, fonts: Fonts, roofPathD: string, wordmarkSvg: string): string {
  const L = LABELS[lang];
  const zh = lang === 'zh';
  const top = LEVEL_ORDER.flatMap((level) => d.risks.filter((r) => r.level === level)).slice(0, 3);
  const css = `
    .side { position: relative; width: 148mm; height: 105mm; padding: 9mm 11mm; overflow: hidden; page-break-after: always; }
    .side:last-child { page-break-after: auto; }
    .front { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5mm; }
    .front svg.line { width: 104mm; height: auto; }
    .front .wordmark svg { width: 46mm; height: auto; color: ${color.ink}; }
    .front .rec { position: absolute; bottom: 8mm; left: 0; right: 0; text-align: center; font-size: 7pt; letter-spacing: 0.16em; }
    .back { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr auto; column-gap: 8mm; }
    .back h1 { grid-column: 1 / -1; margin: 0 0 4mm; font-size: ${zh ? 14 : 17}pt; line-height: 1.1; }
    .back ol { margin: 1.5mm 0 0; padding: 0 0 0 4.5mm; font-size: ${zh ? 7.6 : 7.8}pt; line-height: 1.38; }
    .back li { margin-bottom: 1.4mm; }
    .hand { grid-column: 1 / -1; margin-top: 2mm; }
    .hand .rule { height: 7mm; border-bottom: 0.4pt solid ${color.stone}; }
    .tiny { grid-column: 1 / -1; margin: 2.5mm 0 0; font-size: 5.8pt; line-height: 1.35; color: ${color.stoneText}; }
    .sample { position: absolute; top: 3.5mm; right: 11mm; font-size: 6pt; color: ${color.stoneText}; }
  `;
  return `${head(lang, fonts, '148mm 105mm', css)}
  <section class="side front">
    <svg class="line" viewBox="0 0 1000 120"><path d="${roofPathD}" fill="none" stroke="${color.ink}" stroke-width="1.6" stroke-linejoin="miter"/></svg>
    <div class="wordmark">${wordmarkSvg}</div>
    <div class="rec mono">${esc(L.title.toUpperCase())} · ${esc(d.recordNo)}</div>
  </section>
  <section class="side back">
    ${d.sample ? `<div class="sample">${esc(L.sample)}</div>` : ''}
    <h1 class="serif">${esc(d.property.label)}</h1>
    <div><div class="label">${esc(L.cardTop)}</div><ol>${top.map((r) => `<li>${esc(r.found)}</li>`).join('')}</ol></div>
    <div><div class="label">${esc(L.cardAsk)}</div><ol>${d.questions.slice(0, 3).map((q) => `<li>${esc(q.text)}</li>`).join('')}</ol></div>
    <div class="hand"><div class="label">${esc(L.cardHand)}</div><div class="rule"></div><div class="rule"></div></div>
    <p class="tiny">${esc(L.disclaimer)} ${esc(L.noCommissionShort)}</p>
  </section>
</body></html>`;
}

/* ------------------------------------------------------------------ plate */

const PLATE_COPY = {
  heading: { en: 'Consultation fees', zh: '诊金', ms: 'Yuran konsultasi' },
  by: { en: 'By property value', zh: '按房产价值', ms: 'Mengikut nilai hartanah' },
  urgent: { en: 'Urgent, video within 2 hours: fee + 50%', zh: '急诊，两小时内视频：诊金 + 50%', ms: 'Segera, video dalam 2 jam: yuran + 50%' },
  review: { en: 'Pre-signing review: half fee', zh: '签约前复诊：半价', ms: 'Semakan sebelum tandatangan: separuh yuran' },
  commission: { en: 'No commission. Ever.', zh: '零佣金。', ms: 'Tiada komisen.' },
  hours: { en: 'Tue – Sun', zh: '周二至周日', ms: 'Sel – Ahd' },
  closed: { en: 'Closed Mondays', zh: '周一休息', ms: 'Tutup hari Isnin' },
} as const;

/**
 * The fee plate beside the door: every fee in public, so anyone dares to walk in
 * (brief §3.2, §6.1). Drawn from brand/pricing.ts, so the plate can never disagree
 * with the website or the app. Single colour for etching into brushed bronze.
 */
export function plateHtml(fonts: Fonts, hours: { opens: string; closes: string }, wordmarkSvg: string): string {
  const rows = bands.map((b, i) => {
    const prev = bands[i - 1];
    const range = b.upTo === null ? `> RM ${group((prev?.upTo ?? 0) / 1000)}k` : prev ? `RM ${group(prev.upTo! / 1000)}k – ${group(b.upTo / 1000)}k` : `≤ RM ${group(b.upTo / 1000)}k`;
    return `<tr><td>${range.replace('1,000k', '1M').replace('2,000k', '2M')}</td><td class="fee">${rm(consultFee('clinic', b.id))}</td></tr>`;
  });
  const tri = (k: keyof typeof PLATE_COPY) =>
    `<span>${esc(PLATE_COPY[k].en)}</span><span class="zh">${esc(PLATE_COPY[k].zh)}</span><span>${esc(PLATE_COPY[k].ms)}</span>`;
  const css = `
    .plate { width: 300mm; height: 400mm; padding: 26mm 24mm; display: flex; flex-direction: column; color: ${color.ink}; }
    .plate .wordmark svg { width: 92mm; height: auto; color: ${color.ink}; }
    .tri { display: flex; flex-direction: column; gap: 1.5mm; }
    .tri .zh { font-family: 'Noto Sans SC', sans-serif; }
    h1 { margin: 22mm 0 4mm; font-size: 30pt; line-height: 1.15; font-family: 'Instrument Serif', 'Noto Serif SC', serif; font-weight: 400; }
    .plate h1 .zh { font-family: 'Noto Serif SC', serif; font-weight: 300; }
    .by { font-size: 13pt; }
    table { width: 100%; margin: 10mm 0 8mm; border-collapse: collapse; font-size: 22pt; }
    td { padding: 4.2mm 0; border-bottom: 0.8pt solid ${color.ink}; }
    tr:first-child td { border-top: 0.8pt solid ${color.ink}; }
    td.fee { text-align: right; font-family: 'Geist Mono', monospace; }
    .rules { font-size: 13pt; display: flex; flex-direction: column; gap: 5mm; }
    .bottom { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 13pt; }
    .bottom .mono { font-size: 16pt; }
  `;
  return `${head('en', fonts, '300mm 400mm', css)}
  <section class="plate">
    <div class="wordmark">${wordmarkSvg}</div>
    <h1 class="tri">${tri('heading')}</h1>
    <div class="tri by">${tri('by')}</div>
    <table>${rows.join('')}</table>
    <div class="rules">
      <div class="tri">${tri('urgent')}</div>
      <div class="tri">${tri('review')}</div>
    </div>
    <div class="bottom">
      <div class="tri">${tri('commission')}</div>
      <div class="tri" style="text-align:right">${tri('hours')}<span class="mono">${hours.opens} – ${hours.closes}</span><span>${esc(PLATE_COPY.closed.en)} · <span class="zh">${esc(PLATE_COPY.closed.zh)}</span> · ${esc(PLATE_COPY.closed.ms)}</span></div>
    </div>
  </section>
</body></html>`;
}
