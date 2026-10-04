/**
 * Reel copy in three languages (brief §9.5: each language rendered separately).
 * Case episodes (R2) and market data (R5) live in data/*.json instead.
 * EN and BM need native review before publishing.
 */
export type Lang = 'en' | 'zh' | 'ms';
export const LANGS: Lang[] = ['en', 'zh', 'ms'];

type T = Record<Lang, string>;
type TL = Record<Lang, string[]>;

export const COPY = {
  /** Small line at the end of every educational reel (brief §9.7). */
  disclaimer: { en: 'General information, not personal advice.', zh: '一般资讯，非个人建议。', ms: 'Maklumat umum, bukan nasihat peribadi.' } as T,
  tagline: { en: 'We don’t sell. We tell.', zh: '我们不卖房，所以敢说真话。', ms: 'Kami tak jual. Kami beritahu.' } as T,

  beforeYouSign: {
    title: { en: 'Before you sign: five checks.', zh: '签约之前，先做五件事。', ms: 'Sebelum tandatangan: lima semakan.' } as T,
    items: {
      en: [
        'Read the whole SPA, not the summary.',
        'Check the title: freehold or leasehold, and years left.',
        'Ask for the sinking fund balance.',
        'Confirm the bank will finance at this tenure.',
        'Walk the unit at night, and when it rains.',
      ],
      zh: ['读完整份 SPA，不只看摘要。', '查地契：永久还是租赁，还剩几年。', '问清楚维修基金余额。', '确认银行在这个年限下愿意贷款。', '晚上去看一次，下雨天再看一次。'],
      ms: [
        'Baca keseluruhan SPA, bukan ringkasan.',
        'Semak hak milik: bebas atau pajakan, dan baki tahun.',
        'Tanya baki kumpulan wang penjelas.',
        'Pastikan bank akan membiayai bagi tempoh ini.',
        'Lawat unit pada waktu malam, dan ketika hujan.',
      ],
    } as TL,
    cta: { en: 'A 15-minute review before the deposit.', zh: '下定前，15 分钟复诊。', ms: 'Semakan 15 minit sebelum deposit.' } as T,
  },

  fee: {
    title: { en: 'What does a consult cost?', zh: '诊金是多少？', ms: 'Berapa yuran konsultasi?' } as T,
    value: { en: 'Property value', zh: '房产价值', ms: 'Nilai hartanah' } as T,
    fee: { en: 'Fee', zh: '诊金', ms: 'Yuran' } as T,
    outro: { en: 'Prices published. On our door.', zh: '价目公开，贴在门口。', ms: 'Harga dipaparkan. Di pintu kami.' } as T,
  },

  lounge: {
    line: { en: 'Members drop in any time.', zh: '会员随时来坐。', ms: 'Ahli boleh singgah bila-bila masa.' } as T,
    sub: { en: 'Kopi, kuih, and the market talk.', zh: '咖啡、糕点，和最新市场消息。', ms: 'Kopi, kuih dan cerita pasaran.' } as T,
  },

  store: {
    line: { en: 'Opening soon in Petaling Jaya.', zh: 'Petaling Jaya，即将开业。', ms: 'Dibuka tidak lama lagi di Petaling Jaya.' } as T,
    sub: { en: 'Join the member waitlist.', zh: '会员候补名单现已开放。', ms: 'Senarai menunggu ahli kini dibuka.' } as T,
  },

  card: {
    line: { en: '300 members per clinic.', zh: '每店名额 300 位。', ms: '300 ahli bagi setiap klinik.' } as T,
    sub: { en: 'Same price for everyone. Limited places.', zh: '人人同价，名额有限。', ms: 'Harga sama untuk semua. Tempat terhad.' } as T,
  },

  market: {
    sample: { en: 'SAMPLE DATA — NOT FOR PUBLICATION', zh: '示例数据 · 不可发布', ms: 'DATA CONTOH — BUKAN UNTUK DITERBITKAN' } as T,
    source: { en: 'Source', zh: '来源', ms: 'Sumber' } as T,
  },
};
