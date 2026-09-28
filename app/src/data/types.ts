/** Phase 1 data model (brief §8.4). Mock only; Supabase arrives in phase 2. */
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
