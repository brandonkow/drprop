/**
 * The data source the screens use. Preview: the local mock (src/data/mock.ts).
 * Supabase: the real backend (src/data/supabase.ts). Both have the same shape, so
 * the screens don't know which one they talk to, except where the words differ:
 * the backend takes no payment yet, so its bookings are requests an adviser confirms.
 */
import type { ConsultType, PriceBand } from '@drprop/brand/pricing';
import { runtime } from '../backend/config';
import { mockSource } from './mock';
import { liveSource } from './supabase';
import type { CheckinCode, Consultation, Lang, Lounge, Membership, Slot, User } from './types';

export interface BookingDraft {
  type: ConsultType;
  band: PriceBand;
  propertyLabel?: string;
  attachments: string[];
  /** ISO start of the chosen slot. Urgent consults have none. */
  scheduledAt?: string;
  slotId?: string;
  /** For a pre-signing review: the consult it follows. */
  followUpOf?: string;
}

export interface Loaded {
  membership: Membership | null;
  consultations: Consultation[];
  /** An active adviser: Me shows the adviser schedule. */
  staff: boolean;
}

export interface DataSource {
  kind: 'preview' | 'connected';
  requestOtp(phone: string): Promise<void>;
  /** Signs in. displayName is '' until the client chooses one. */
  verifyOtp(phone: string, code: string, language: Lang): Promise<User>;
  /** The saved sign-in, if any. The preview keeps its own copy in app state: null. */
  restore(): Promise<User | null>;
  saveProfile(user: User): Promise<void>;
  load(user: User): Promise<Loaded>;
  lounge(): Promise<Lounge | null>;
  /** Bookable times for the next days, earliest first. */
  slots(type: ConsultType): Promise<Slot[]>;
  /** Fee in RM. */
  quote(type: ConsultType, band: PriceBand): Promise<number>;
  /** Whether an urgent call-back can be taken right now. */
  urgentOpen(): Promise<boolean>;
  /** requestId makes a retried request return the same booking. */
  book(user: User, draft: BookingDraft, fee: number, requestId: string): Promise<Consultation>;
  cancel(c: Consultation): Promise<Consultation>;
  /** A fresh check-in code for an active member's card. The card asks for a new one every minute. */
  checkinCode(): Promise<CheckinCode>;
  /** Renewal needs payment: the backend has none yet, so members renew at the desk. */
  canRenew: boolean;
  renew(m: Membership): Promise<Membership>;
  signOut(): Promise<void>;
}

export const source: DataSource = runtime.mode === 'supabase' ? liveSource : mockSource;
