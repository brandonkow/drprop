/**
 * Mock backend for phase 1. Every function is async and slightly delayed so
 * screens are written against the shape of the real (Supabase) calls.
 * Nothing here is real customer data.
 */
import { consultFee } from '@drprop/brand/pricing';
import type { BookingDraft, DataSource } from './source';
import type { Consultation, Lang, Membership, Store, User } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const id = () => Math.random().toString(36).slice(2, 10);

export const STORE: Store = {
  id: 'pj',
  name: 'Petaling Jaya',
  address: 'Jalan —, 46000 Petaling Jaya, Selangor',
  hours: 'Tue–Sun 10:00–20:00',
  memberCap: 300,
  memberCount: 258,
  loungeSeatsFree: 3,
  todaysCoffee: 'Kopi Tarik · Ipoh',
  loungeMood: 'quiet',
};

/** OTP is not checked in the mock: any six digits sign in. */
export async function requestOtp(phone: string): Promise<void> {
  await wait(500);
  if (!/^\+?\d{9,13}$/.test(phone.replace(/[\s-]/g, ''))) throw new Error('invalid-phone');
}

export async function verifyOtp(phone: string, code: string, language: Lang): Promise<User> {
  await wait(600);
  if (!/^\d{6}$/.test(code)) throw new Error('invalid-code');
  return { id: id(), phone, displayName: '', language };
}

export function membershipFor(user: User): Membership {
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);
  return {
    userId: user.id,
    storeId: STORE.id,
    memberNo: `PJ-${String(STORE.memberCount + 1).padStart(4, '0')}`,
    status: 'active',
    renewsAt: renews.toISOString().slice(0, 10),
  };
}

const SAMPLE: Record<Lang, { label: string; note: string; questions: string[] }> = {
  en: {
    label: 'Sample · 2-storey terrace',
    note: 'Sample record. Leasehold with 71 years left: check the bank will still finance 90% at this tenure before paying the deposit.',
    questions: [
      'How many years are left on the lease, exactly?',
      'What is the sinking fund balance, and is a special levy planned?',
      'Is the extension at the back approved by the council?',
    ],
  },
  zh: {
    label: '示例 · 双层排屋',
    note: '示例病历。租赁地契剩 71 年：付订金前先确认银行在这个年限下仍愿意贷 90%。',
    questions: ['地契确切还剩多少年？', '维修基金（sinking fund）余额多少？近期有没有特别征费？', '屋后的扩建有没有市政厅批准？'],
  },
  ms: {
    label: 'Contoh · Teres 2 tingkat',
    note: 'Rekod contoh. Pajakan berbaki 71 tahun: pastikan bank masih membiayai 90% bagi tempoh ini sebelum membayar deposit.',
    questions: [
      'Berapa tahun sebenarnya baki pajakan?',
      'Berapa baki kumpulan wang penjelas, dan adakah levi khas dirancang?',
      'Adakah pengubahsuaian di belakang diluluskan oleh majlis?',
    ],
  },
};

/** One finished sample record so the records tab and the review flow can be tried. */
export function sampleHistory(user: User): Consultation[] {
  const when = new Date();
  when.setDate(when.getDate() - 12);
  when.setHours(15, 0, 0, 0);
  const copy = SAMPLE[user.language];
  return [
    {
      id: 'sample',
      userId: user.id,
      type: 'clinic',
      priceBand: '600k-1m',
      fee: consultFee('clinic', '600k-1m'),
      scheduledAt: when.toISOString(),
      status: 'done',
      propertyLabel: copy.label,
      advisorNote: copy.note,
      questions: copy.questions,
      attachments: [],
      createdAt: when.toISOString(),
    },
  ];
}

export async function book(user: User, draft: BookingDraft): Promise<Consultation> {
  await wait(900);
  return {
    id: id(),
    userId: user.id,
    type: draft.type,
    priceBand: draft.band,
    fee: consultFee(draft.type, draft.band),
    scheduledAt: draft.type === 'urgent' ? undefined : draft.scheduledAt,
    status: 'booked',
    attachments: draft.attachments,
    propertyLabel: draft.propertyLabel,
    followUpOf: draft.followUpOf,
    createdAt: new Date().toISOString(),
  };
}

export async function renew(m: Membership): Promise<Membership> {
  await wait(700);
  const next = new Date(m.renewsAt);
  next.setMonth(next.getMonth() + 1);
  return { ...m, status: 'active', renewsAt: next.toISOString().slice(0, 10) };
}

/** Open slots for a day: every 30 minutes from 10:00 to 19:30. Mondays closed. */
export function slotsFor(day: Date): Date[] {
  if (day.getDay() === 1) return [];
  const out: Date[] = [];
  for (let m = 10 * 60; m <= 19 * 60 + 30; m += 30) {
    const d = new Date(day);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    if (d.getTime() > Date.now() + 60 * 60 * 1000) out.push(d);
  }
  return out;
}

/** The preview: everything above, nothing leaves the phone. */
export const mockSource: DataSource = {
  kind: 'preview',
  requestOtp,
  verifyOtp,
  restore: async () => null,
  saveProfile: async () => {},
  load: async (user) => ({ membership: membershipFor(user), consultations: sampleHistory(user), staff: false }),
  lounge: async () => ({ mood: STORE.loungeMood, seatsFree: STORE.loungeSeatsFree, coffee: STORE.todaysCoffee }),
  slots: async () => {
    const out = [];
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    for (let i = 0; i < 8; i++, day.setDate(day.getDate() + 1)) {
      for (const d of slotsFor(day)) out.push({ id: d.toISOString(), at: d.toISOString() });
    }
    return out;
  },
  quote: async (type, band) => consultFee(type, band),
  urgentOpen: async () => true,
  book: (user, draft) => book(user, draft),
  cancel: async (c) => {
    await wait(500);
    return { ...c, status: 'cancelled' };
  },
  // Nothing to scan it against in the preview; the code only has to look like the real one.
  checkinCode: async () => ({
    code: String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  }),
  canRenew: true,
  renew,
  signOut: async () => {},
};
