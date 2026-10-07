/**
 * The diagnosis report (诊断书), the thing a client takes away and what the fee
 * pays for (brief §3.2, §4.4): risks, the questions to ask, next steps, the
 * adviser's own line, and the disclaimer every diagnosis carries (§2.5).
 *
 * What it never contains (§2): a valuation or "what you should pay", advice on
 * negotiating, or a recommendation of a unit for sale. Public market figures may
 * appear as information, with their source.
 */
import { consultFee, type ConsultType, type PriceBand } from '../pricing.ts';

export type Lang = 'en' | 'zh' | 'ms';
export type RiskLevel = 'resolve' | 'ask' | 'watch';
export type Whom = 'lawyer' | 'seller' | 'bank' | 'neighbours';

export interface Diagnosis {
  /** True for illustrations: the report and card carry a "sample" banner. */
  sample: boolean;
  recordNo: string;
  /** ISO date of the consult. */
  date: string;
  client: string;
  adviser: string;
  consult: { type: ConsultType; band: PriceBand };
  property: { label: string; kind: string; tenure: string; title: string; stage: string };
  documents: string[];
  /** "What we see": two or three sentences, no verdict on whether to buy. */
  summary: string;
  risks: { level: RiskLevel; area: string; found: string; why: string; basis: string }[];
  questions: { whom: Whom; text: string }[];
  nextSteps: string[];
  /** Typed here; on the card the adviser writes it by hand (§4.4). */
  adviserNote: string;
}

export const fee = (d: Diagnosis) => consultFee(d.consult.type, d.consult.band);

/** Words a diagnosis must not use (brief §2.2, §2.3). Checked by brand/test/print.test.ts. */
export const FORBIDDEN = [/\bvalu(ation|er|ers|ed)\b/i, /\b(under|over)valued\b/i, /估价|估值|笋盘/, /\bpenilaian\b|\bpenilai\b/i];

export const LABELS = {
  en: {
    title: 'Property diagnosis',
    sample: 'Sample: a fictional property, for illustration',
    record: 'Record',
    date: 'Date',
    client: 'Client',
    adviser: 'Adviser',
    consult: 'Consult',
    fee: 'Fee',
    property: 'Property',
    tenure: 'Tenure',
    titleType: 'Title',
    stage: 'Stage',
    documents: 'Documents we read',
    whatWeSee: 'What we see',
    risks: 'Risks',
    levels: { resolve: 'Resolve before signing', ask: 'Ask before signing', watch: 'Keep in view' },
    area: 'Area',
    found: 'What we found',
    why: 'Why it matters',
    basis: 'Based on',
    questions: 'Questions to ask',
    whom: { lawyer: 'Your lawyer', seller: 'The seller', bank: 'Your bank', neighbours: 'The neighbours' },
    next: 'Next steps',
    note: 'From your adviser',
    signature: 'Adviser',
    noCommission: 'Dr Prop takes no commission from anyone in this transaction. The fee above is all we are paid.',
    noCommissionShort: 'Dr Prop takes no commission from anyone.',
    disclaimer: 'This diagnosis is information and analysis, not legal, tax or financial advice. The final decision is the client’s own.',
    page: 'Page {n} of {of}',
    cardTop: 'Three to settle first',
    cardAsk: 'Ask',
    cardHand: 'In your adviser’s hand',
  },
  zh: {
    title: '房产诊断书',
    sample: '示例：虚构房产，仅供展示',
    record: '病历号',
    date: '日期',
    client: '客户',
    adviser: '顾问',
    consult: '问诊',
    fee: '诊金',
    property: '房产',
    tenure: '地契',
    titleType: '地契类别',
    stage: '阶段',
    documents: '我们看过的文件',
    whatWeSee: '我们看到的',
    risks: '风险点',
    levels: { resolve: '签约前必须解决', ask: '签约前要问清楚', watch: '留意' },
    area: '方面',
    found: '我们看到',
    why: '为什么重要',
    basis: '依据',
    questions: '问题清单',
    whom: { lawyer: '问你的律师', seller: '问卖方', bank: '问你的银行', neighbours: '问邻居' },
    next: '下一步',
    note: '顾问的话',
    signature: '顾问',
    noCommission: 'Dr Prop 不向本交易的任何一方收取佣金。以上诊金是我们的全部收入。',
    noCommissionShort: 'Dr Prop 不向任何一方收取佣金。',
    disclaimer: '本诊断为资讯与分析，不构成法律、税务或财务意见，最终决定由客户自行作出。',
    page: '第 {n} 页，共 {of} 页',
    cardTop: '先解决这三件事',
    cardAsk: '要问的',
    cardHand: '顾问手写',
  },
  ms: {
    title: 'Diagnosis hartanah',
    sample: 'Contoh: hartanah rekaan, untuk ilustrasi',
    record: 'Rekod',
    date: 'Tarikh',
    client: 'Pelanggan',
    adviser: 'Penasihat',
    consult: 'Konsultasi',
    fee: 'Yuran',
    property: 'Hartanah',
    tenure: 'Pegangan',
    titleType: 'Hak milik',
    stage: 'Peringkat',
    documents: 'Dokumen yang kami baca',
    whatWeSee: 'Apa yang kami nampak',
    risks: 'Risiko',
    levels: { resolve: 'Selesaikan sebelum tandatangan', ask: 'Tanya sebelum tandatangan', watch: 'Perhatikan' },
    area: 'Perkara',
    found: 'Apa yang kami dapati',
    why: 'Kenapa penting',
    basis: 'Berdasarkan',
    questions: 'Soalan untuk ditanya',
    whom: { lawyer: 'Peguam anda', seller: 'Penjual', bank: 'Bank anda', neighbours: 'Jiran' },
    next: 'Langkah seterusnya',
    note: 'Daripada penasihat anda',
    signature: 'Penasihat',
    noCommission: 'Dr Prop tidak mengambil komisen daripada sesiapa dalam transaksi ini. Yuran di atas ialah satu-satunya bayaran kami.',
    noCommissionShort: 'Dr Prop tidak mengambil komisen daripada sesiapa.',
    disclaimer: 'Diagnosis ini ialah maklumat dan analisis, bukan nasihat undang-undang, cukai atau kewangan. Keputusan muktamad dibuat oleh pelanggan sendiri.',
    page: 'Halaman {n} daripada {of}',
    cardTop: 'Tiga perkara untuk diselesaikan dahulu',
    cardAsk: 'Tanya',
    cardHand: 'Tulisan tangan penasihat',
  },
} as const;

export const CONSULT_NAMES: Record<Lang, Record<ConsultType, string>> = {
  en: { clinic: 'Consult, 30 minutes', urgent: 'Urgent, by video', review: 'Pre-signing review' },
  zh: { clinic: '门诊，30 分钟', urgent: '急诊，视频', review: '签约前复诊' },
  ms: { clinic: 'Konsultasi, 30 minit', urgent: 'Segera, melalui video', review: 'Semakan sebelum tandatangan' },
};

/** One fictional record, the same house as the app's sample (app/src/data/mock.ts). */
export const SAMPLE: Record<Lang, Diagnosis> = {
  en: {
    sample: true,
    recordNo: 'DP-0417',
    date: '2026-09-25',
    client: 'Mr Tan (sample)',
    adviser: 'N. Rahman (sample)',
    consult: { type: 'clinic', band: '600k-1m' },
    property: {
      label: '2-storey terrace, Petaling Jaya',
      kind: 'Intermediate terrace, 22 × 75 ft, built 1996',
      tenure: 'Leasehold to 2097: 71 years left',
      title: 'Individual title, restriction in interest',
      stage: 'Subsale. Offer letter drafted, no deposit paid',
    },
    documents: ['Title search (seller’s copy)', 'Draft offer letter', 'Approved building plan, 1996', 'Site photos from the viewing'],
    summary:
      'A sound house with two things to settle before any money changes hands: how your bank treats a lease with 71 years left, and the kitchen extension that is not on the approved plan. Neither is unusual. Both should be answered in writing before you sign.',
    risks: [
      {
        level: 'resolve',
        area: 'Lease',
        found: 'Leasehold to 2097: 71 years left.',
        why: 'Banks look at the years left when deciding how much and for how long to lend. It also matters to whoever buys from you later.',
        basis: 'Title search',
      },
      {
        level: 'resolve',
        area: 'Extension',
        found: 'The kitchen extension at the back is not on the approved plan we were shown.',
        why: 'Unapproved works can bring a council notice, and some banks will not lend on them.',
        basis: 'Approved plan and site photos',
      },
      {
        level: 'ask',
        area: 'State consent',
        found: 'The title carries a restriction in interest: a transfer needs the state’s consent.',
        why: 'Consent takes weeks and has a fee. The agreement should allow the time and say who pays.',
        basis: 'Title search',
      },
      {
        level: 'ask',
        area: 'Arrears',
        found: 'No receipts for this year’s quit rent or assessment.',
        why: 'Unpaid amounts can follow the property. The agreement usually makes the seller clear them.',
        basis: 'Documents provided',
      },
      {
        level: 'watch',
        area: 'Drainage',
        found: 'The back-lane drain was blocked in the photos.',
        why: 'Standing water brings damp and mosquitoes. Worth a look after heavy rain.',
        basis: 'Site photos',
      },
    ],
    questions: [
      { whom: 'bank', text: 'How much will you lend, and for how many years, on a leasehold with 71 years left?' },
      { whom: 'seller', text: 'Was the kitchen extension approved by the council? May we see the approval letter?' },
      { whom: 'seller', text: 'When were the roof and the wiring last redone?' },
      { whom: 'lawyer', text: 'How long does state consent take here, and who pays its fee?' },
      { whom: 'lawyer', text: 'If my loan is not approved, does the agreement return my deposit?' },
      { whom: 'neighbours', text: 'Does the back lane flood after heavy rain?' },
    ],
    nextSteps: [
      'Get your bank’s answer on the lease, in writing.',
      'Ask the seller for the extension’s approval letter.',
      'Have your lawyer check the title, the consent timeline and the arrears.',
      'Book the 15-minute pre-signing review (half fee) before you pay the deposit.',
    ],
    adviserNote: 'Good house, good street. Get the bank’s answer on the lease first; the rest follows from it.',
  },
  zh: {
    sample: true,
    recordNo: 'DP-0417',
    date: '2026-09-25',
    client: '陈先生（示例）',
    adviser: 'N. Rahman（示例）',
    consult: { type: 'clinic', band: '600k-1m' },
    property: {
      label: '双层排屋，Petaling Jaya',
      kind: '中间排屋，22 × 75 尺，1996 年建',
      tenure: '租赁地契至 2097 年：剩 71 年',
      title: '个别地契，有转让限制',
      stage: '二手房。买卖意向书已拟好，尚未付订金',
    },
    documents: ['地契查册（卖方提供）', '买卖意向书草稿', '1996 年获批建筑图', '看房时的现场照片'],
    summary:
      '房子本身状况不错，但在付任何钱之前，有两件事要先弄清楚：你的银行如何看待剩 71 年的租赁地契，以及厨房扩建不在获批图则上。这两件事都不罕见，但都应该在签约前得到书面答复。',
    risks: [
      {
        level: 'resolve',
        area: '地契年限',
        found: '租赁地契至 2097 年，剩 71 年。',
        why: '银行会根据剩余年限决定贷多少、贷多久；将来转手时，买家同样会在意。',
        basis: '地契查册',
      },
      {
        level: 'resolve',
        area: '扩建',
        found: '屋后的厨房扩建，不在我们看到的获批图则上。',
        why: '未获批的工程可能收到市政厅通知，有些银行也不愿为此贷款。',
        basis: '获批图则与现场照片',
      },
      {
        level: 'ask',
        area: '州政府同意',
        found: '地契有转让限制：过户需要州政府同意。',
        why: '申请同意需要几周时间和费用，买卖合约应留足时间，并写明由谁支付。',
        basis: '地契查册',
      },
      {
        level: 'ask',
        area: '欠缴费用',
        found: '没有今年地税和门牌税的收据。',
        why: '未缴费用可能随房产转移，合约通常要求卖方先缴清。',
        basis: '卖方提供的文件',
      },
      {
        level: 'watch',
        area: '排水',
        found: '照片里屋后巷的水沟堵塞。',
        why: '积水会带来潮湿和蚊子，大雨后值得再去看看。',
        basis: '现场照片',
      },
    ],
    questions: [
      { whom: 'bank', text: '剩 71 年的租赁地契，你们能贷多少、贷多少年？' },
      { whom: 'seller', text: '厨房扩建有没有市政厅批准？可以看批准信吗？' },
      { whom: 'seller', text: '屋顶和电线上一次翻新是什么时候？' },
      { whom: 'lawyer', text: '这里申请州政府同意要多久？费用由谁付？' },
      { whom: 'lawyer', text: '如果贷款批不下来，合约会退还订金吗？' },
      { whom: 'neighbours', text: '大雨后屋后巷会不会积水？' },
    ],
    nextSteps: [
      '请银行以书面答复地契年限的问题。',
      '向卖方要扩建的批准信。',
      '请律师查地契、同意的时间表和欠缴费用。',
      '付订金之前，预约 15 分钟的签约前复诊（半价）。',
    ],
    adviserNote: '房子好，街也好。先拿到银行对地契年限的答复，其余的就跟着来。',
  },
  ms: {
    sample: true,
    recordNo: 'DP-0417',
    date: '2026-09-25',
    client: 'Encik Tan (contoh)',
    adviser: 'N. Rahman (contoh)',
    consult: { type: 'clinic', band: '600k-1m' },
    property: {
      label: 'Teres 2 tingkat, Petaling Jaya',
      kind: 'Teres tengah, 22 × 75 kaki, dibina 1996',
      tenure: 'Pajakan hingga 2097: baki 71 tahun',
      title: 'Hak milik individu, ada sekatan kepentingan',
      stage: 'Subjual. Surat tawaran sudah dirangka, deposit belum dibayar',
    },
    documents: ['Carian hak milik (salinan penjual)', 'Draf surat tawaran', 'Pelan bangunan yang diluluskan, 1996', 'Gambar semasa lawatan'],
    summary:
      'Rumah yang baik, dengan dua perkara untuk diselesaikan sebelum sebarang bayaran: cara bank anda melihat pajakan berbaki 71 tahun, dan sambungan dapur yang tiada dalam pelan yang diluluskan. Kedua-duanya biasa berlaku. Kedua-duanya patut dijawab secara bertulis sebelum anda menandatangani.',
    risks: [
      {
        level: 'resolve',
        area: 'Pajakan',
        found: 'Pajakan hingga 2097: baki 71 tahun.',
        why: 'Bank melihat baki tahun untuk menentukan jumlah dan tempoh pinjaman. Pembeli anda kelak juga akan melihatnya.',
        basis: 'Carian hak milik',
      },
      {
        level: 'resolve',
        area: 'Sambungan',
        found: 'Sambungan dapur di belakang tiada dalam pelan yang diluluskan yang kami lihat.',
        why: 'Kerja tanpa kelulusan boleh menerima notis majlis, dan sesetengah bank tidak akan membiayainya.',
        basis: 'Pelan diluluskan dan gambar lawatan',
      },
      {
        level: 'ask',
        area: 'Kebenaran negeri',
        found: 'Hak milik ada sekatan kepentingan: pindah milik memerlukan kebenaran negeri.',
        why: 'Kebenaran mengambil masa beberapa minggu dan ada fi. Perjanjian patut memberi masa dan menyatakan siapa yang membayar.',
        basis: 'Carian hak milik',
      },
      {
        level: 'ask',
        area: 'Tunggakan',
        found: 'Tiada resit cukai tanah atau cukai taksiran tahun ini.',
        why: 'Tunggakan boleh mengikut hartanah. Perjanjian biasanya mewajibkan penjual menjelaskannya.',
        basis: 'Dokumen yang diberi',
      },
      {
        level: 'watch',
        area: 'Saliran',
        found: 'Longkang lorong belakang tersumbat dalam gambar.',
        why: 'Air bertakung membawa lembap dan nyamuk. Elok dilihat selepas hujan lebat.',
        basis: 'Gambar lawatan',
      },
    ],
    questions: [
      { whom: 'bank', text: 'Berapa banyak dan berapa tahun anda boleh biayai pajakan berbaki 71 tahun?' },
      { whom: 'seller', text: 'Adakah sambungan dapur diluluskan oleh majlis? Boleh kami lihat surat kelulusannya?' },
      { whom: 'seller', text: 'Bila kali terakhir bumbung dan pendawaian diperbaharui?' },
      { whom: 'lawyer', text: 'Berapa lama kebenaran negeri di sini, dan siapa yang membayar finya?' },
      { whom: 'lawyer', text: 'Jika pinjaman saya tidak lulus, adakah perjanjian memulangkan deposit saya?' },
      { whom: 'neighbours', text: 'Adakah lorong belakang banjir selepas hujan lebat?' },
    ],
    nextSteps: [
      'Dapatkan jawapan bank tentang pajakan, secara bertulis.',
      'Minta surat kelulusan sambungan daripada penjual.',
      'Minta peguam anda menyemak hak milik, tempoh kebenaran dan tunggakan.',
      'Tempah semakan 15 minit sebelum tandatangan (separuh yuran) sebelum membayar deposit.',
    ],
    adviserNote: 'Rumah yang baik, jalan yang baik. Dapatkan jawapan bank tentang pajakan dahulu; yang lain akan menyusul.',
  },
};
