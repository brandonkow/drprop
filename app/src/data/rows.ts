/** Pure mapping between database rows and the app's types (no React Native imports: unit-tested). */
import type { ConsultType, PriceBand } from '@drprop/brand/pricing';
import type { Consultation } from './types';

type Status = 'requested' | 'confirmed' | 'completed' | 'cancelled';

/** A dp_bookings row. */
export interface BookingRow {
  id: string;
  user_id: string;
  adviser_id: string | null;
  slot_id: string | null;
  consultation_type: ConsultType;
  price_band: PriceBand;
  property_label: string;
  follow_up_of: string | null;
  fee_minor: number;
  starts_at: string;
  ends_at: string;
  status: Status;
  advisor_note: string | null;
  questions: string[];
  created_at: string;
}

/** The row → the app's record (brief §8.4 shape). */
export function toConsultation(b: BookingRow): Consultation {
  return {
    id: b.id,
    userId: b.user_id,
    type: b.consultation_type,
    priceBand: b.price_band,
    fee: b.fee_minor / 100,
    scheduledAt: b.consultation_type === 'urgent' ? undefined : b.starts_at,
    status: b.status === 'completed' ? 'done' : b.status === 'cancelled' ? 'cancelled' : 'booked',
    pending: b.status === 'requested',
    followUpOf: b.follow_up_of ?? undefined,
    advisorNote: b.advisor_note ?? undefined,
    questions: b.questions.length ? b.questions : undefined,
    attachments: [],
    propertyLabel: b.property_label,
    createdAt: b.created_at,
  };
}

/** Malaysian mobile numbers only: +60 then 9–10 digits. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  const e164 = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+60${digits.slice(1)}` : `+${digits}`;
  return /^\+60\d{9,10}$/.test(e164) ? e164 : null;
}
