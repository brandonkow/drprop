/** The diagnosis report and the fee plate: brief §2 rules hold for every language. */
import { describe, expect, it } from 'vitest';
import { consultFee } from '../pricing.ts';
import { FORBIDDEN, LABELS, SAMPLE, fee, type Lang } from '../print/diagnosis.ts';
import { cardHtml, plateHtml, reportHtml } from '../print/render.ts';

const LANGS: Lang[] = ['en', 'zh', 'ms'];
const fonts = { css: [] };
const text = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(text) : [];

describe('diagnosis report', () => {
  it('carries the brief §2.5 disclaimer word for word in Chinese', () => {
    expect(LABELS.zh.disclaimer).toBe('本诊断为资讯与分析，不构成法律、税务或财务意见，最终决定由客户自行作出。');
  });

  it.each(LANGS)('%s uses no valuation or deal-recommendation wording (§2.2, §2.3)', (lang) => {
    const all = [...text(SAMPLE[lang]), ...text(LABELS[lang])];
    for (const re of FORBIDDEN) expect(all.filter((s) => re.test(s))).toEqual([]);
  });

  it('is the same record in every language', () => {
    const shape = (lang: Lang) => ({
      risks: SAMPLE[lang].risks.map((r) => r.level),
      questions: SAMPLE[lang].questions.map((q) => q.whom),
      steps: SAMPLE[lang].nextSteps.length,
      docs: SAMPLE[lang].documents.length,
      consult: SAMPLE[lang].consult,
    });
    expect(shape('zh')).toEqual(shape('en'));
    expect(shape('ms')).toEqual(shape('en'));
  });

  it.each(LANGS)('%s renders the fee, the disclaimer, the no-commission line and the sample banner', (lang) => {
    const html = reportHtml(SAMPLE[lang], lang, fonts, '<svg></svg>');
    expect(fee(SAMPLE[lang])).toBe(consultFee('clinic', '600k-1m'));
    expect(html).toContain('RM 699');
    expect(html.split(LABELS[lang].disclaimer).length - 1).toBe(2); // on both pages
    expect(html).toContain(LABELS[lang].noCommission);
    expect(html).toContain(LABELS[lang].sample);
    const card = cardHtml(SAMPLE[lang], lang, fonts, 'M0 0', '<svg></svg>');
    expect(card).toContain(LABELS[lang].disclaimer);
    expect(card).toContain(LABELS[lang].noCommissionShort);
  });
});

describe('fee plate (§6.1)', () => {
  it('shows every fee from brand/pricing.ts and the urgent and review rules', () => {
    const html = plateHtml(fonts, { opens: '10:00', closes: '20:00' }, '<svg></svg>');
    for (const amount of ['RM 199', 'RM 399', 'RM 699', 'RM 1,199', 'RM 1,999']) expect(html).toContain(amount);
    expect(html).toContain('fee + 50%');
    expect(html).toContain('half fee');
    expect(html).toContain('No commission.');
  });
});
