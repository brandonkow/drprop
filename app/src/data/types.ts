/** Data model (brief §8.4), shared by the preview mock and the Supabase backend. */
import type { ConsultType, PriceBand } from '@drprop/brand/pricing';

export type Lang = 'en' | 'zh' | 'ms';

export interface User {
  id: string;
  phone: string;
  displayName: string;
  drinkPreference?: string;
  language: Lang;
}

export interface Membership {
  userId: string;
  storeId: string;
  memberNo: string;
  status: 'active' | 'waitlist' | 'expired';
  /** ISO date. */
  renewsAt: string;
}

export interface Consultation {
  id: string;
  userId: string;
  type: ConsultType;
  priceBand: PriceBand;
  fee: number;
  /** ISO date-time. Urgent consults have none: the advisor calls within two hours. */
  scheduledAt?: string;
  status: 'booked' | 'done' | 'cancelled';
  /** Booked but not yet confirmed by an adviser (supabase mode only). */
  pending?: boolean;
  /** For a pre-signing review: the consult it follows. */
  followUpOf?: string;
  reportUrl?: string;
  advisorNote?: string;
  attachments: string[];
  /** Short name the client gave the property, e.g. "TTDI terrace". */
  propertyLabel?: string;
  /** Questions the advisor listed for the client to raise. */
  questions?: string[];
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  hours: string;
  memberCap: number;
  memberCount: number;
  loungeSeatsFree: number;
  todaysCoffee: string;
  /** Lounge mood right now. */
  loungeMood: 'quiet' | 'lively';
}

/** What the member card's QR holds: six digits from the server, good for one check-in (S5). */
export interface CheckinCode {
  code: string;
  /** ISO time the code stops working (two minutes after it was issued). */
  expiresAt: string;
}

/** The Lounge right now, for the home screen. */
export interface Lounge {
  mood: 'quiet' | 'lively';
  seatsFree: number;
  coffee: string;
}

/** A bookable time. Preview: generated; supabase: an adviser's published slot. */
export interface Slot {
  id: string;
  /** ISO start. */
  at: string;
  adviser?: string;
}
