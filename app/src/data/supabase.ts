/**
 * The real backend (supabase/migrations). Every write is a database function that
 * checks who is calling; fees come from the server. No payment is taken yet:
 * a booking is a request until its adviser confirms it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { backendClient, clearSavedSignIn } from '../backend/client';
import { normalizePhone, toConsultation, type BookingRow } from './rows';
import type { BookingDraft, DataSource } from './source';
import type { CheckinCode, Lang, Lounge, Membership, Slot, User } from './types';

interface ProfileRow {
  user_id: string;
  display_name: string;
  drink_preference: string;
  language: Lang;
}

const client = (): SupabaseClient => backendClient();

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as T;
}

async function profile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await client().from('dp_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

async function userFrom(id: string, phone: string, language: Lang): Promise<User> {
  const p = await profile(id);
  return {
    id,
    phone: phone.startsWith('+') ? phone : `+${phone}`,
    displayName: p?.display_name ?? '',
    drinkPreference: p?.drink_preference || undefined,
    language: p?.language ?? language,
  };
}

export const liveSource: DataSource = {
  kind: 'connected',

  async requestOtp(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new Error('invalid-phone');
    const { error } = await client().auth.signInWithOtp({ phone: normalized });
    if (error) throw error;
  },

  async verifyOtp(phone, code, language) {
    const normalized = normalizePhone(phone);
    if (!normalized || !/^\d{6}$/.test(code)) throw new Error('invalid-code');
    const { data, error } = await client().auth.verifyOtp({ phone: normalized, token: code, type: 'sms' });
    if (error || !data.user) throw error ?? new Error('invalid-code');
    return userFrom(data.user.id, data.user.phone ?? normalized, language);
  },

  async restore() {
    const { data, error } = await client().auth.getSession();
    if (error || !data.session) return null;
    // getUser() asks the server: a revoked or unverified session does not get in.
    const { data: checked, error: issue } = await client().auth.getUser();
    if (issue || !checked.user?.phone_confirmed_at) return null;
    return userFrom(checked.user.id, checked.user.phone ?? '', 'en');
  },

  async saveProfile(user) {
    await rpc('dp_save_profile', {
      p_name: user.displayName,
      p_drink: user.drinkPreference ?? '',
      p_language: user.language,
    });
  },

  async load(user) {
    const db = client();
    const [bookings, membership, staff] = await Promise.all([
      db.from('dp_bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      db.from('dp_memberships').select('*').eq('user_id', user.id).maybeSingle(),
      db.from('dp_staff').select('enabled').eq('user_id', user.id).maybeSingle(),
    ]);
    for (const r of [bookings, membership, staff]) if (r.error) throw r.error;
    const m = membership.data as { store_id: string; member_no: string; status: Membership['status']; renews_at: string } | null;
    return {
      consultations: (bookings.data as BookingRow[]).map(toConsultation),
      membership: m && { userId: user.id, storeId: m.store_id, memberNo: m.member_no, status: m.status, renewsAt: m.renews_at },
      staff: (staff.data as { enabled: boolean } | null)?.enabled === true,
    };
  },

  async lounge() {
    const { data, error } = await client().from('dp_lounge').select('*').eq('store_id', 'pj').maybeSingle();
    if (error) throw error;
    const row = data as { seats_free: number; mood: Lounge['mood']; todays_coffee: string } | null;
    return row && { seatsFree: row.seats_free, mood: row.mood, coffee: row.todays_coffee };
  },

  async slots(type) {
    if (type === 'urgent') return [];
    const rows = await rpc<{ id: string; adviser_name: string; starts_at: string }[]>('dp_availability', { p_type: type });
    return rows.map((r): Slot => ({ id: r.id, at: r.starts_at, adviser: r.adviser_name }));
  },

  async quote(type, band) {
    return (await rpc<number>('dp_quote', { p_type: type, p_band: band })) / 100;
  },

  urgentOpen: () => rpc<boolean>('dp_urgent_open'),

  async book(_user, draft: BookingDraft, fee, requestId) {
    const { data, error } = await client()
      .rpc('dp_book', {
        p_request: requestId,
        p_slot: draft.type === 'urgent' ? null : draft.slotId,
        p_type: draft.type,
        p_band: draft.band,
        p_property: draft.propertyLabel?.trim() || 'Property',
        p_follow_up: draft.followUpOf ?? null,
        p_expected_fee: Math.round(fee * 100),
      })
      .single();
    if (error) throw error;
    return toConsultation(data as BookingRow);
  },

  async cancel(c) {
    const { data, error } = await client().rpc('dp_cancel', { p_booking: c.id }).single();
    if (error) throw error;
    return toConsultation(data as BookingRow);
  },

  async checkinCode(): Promise<CheckinCode> {
    const { data, error } = await client().rpc('dp_checkin_code').single();
    if (error) throw error;
    const row = data as { code: string; expires_at: string };
    return { code: row.code, expiresAt: row.expires_at };
  },

  canRenew: false,
  renew: async () => {
    throw new Error('renew-at-desk');
  },

  async signOut() {
    const { error } = await client().auth.signOut({ scope: 'local' });
    if (error) await clearSavedSignIn();
  },
};

/* ------------------------------------------------------------------ advisers */

export interface StaffBooking {
  booking: BookingRow;
  customerName: string;
  customerPhone: string;
  customerDrink: string;
}

/** Who a redeemed check-in code belongs to. */
export interface CheckedIn {
  memberNo: string;
  name: string;
  drink: string;
}

export interface StaffSlot {
  id: string;
  starts_at: string;
  enabled: boolean;
}

/** What an active adviser can do (Me → Adviser schedule). The database checks the role. */
export const staffApi = {
  async bookings(): Promise<StaffBooking[]> {
    const rows = await rpc<{ booking: BookingRow; customer_name: string; customer_phone: string; customer_drink: string }[]>(
      'dp_adviser_bookings',
    );
    return rows.map((r) => ({
      booking: r.booking,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerDrink: r.customer_drink,
    }));
  },
  async slots(userId: string): Promise<StaffSlot[]> {
    const { data, error } = await client()
      .from('dp_slots')
      .select('id, starts_at, enabled')
      .eq('adviser_id', userId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(200);
    if (error) throw error;
    return data as StaffSlot[];
  },
  publish: (startsAt: string) => rpc('dp_publish_slot', { p_start: startsAt }),
  close: (slotId: string) => rpc('dp_close_slot', { p_slot: slotId }),
  takeUrgent: (bookingId: string) => rpc('dp_take_urgent', { p_booking: bookingId }),
  status: (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled') =>
    rpc('dp_adviser_status', { p_booking: bookingId, p_status: status }),
  note: (bookingId: string, note: string, questions: string[]) =>
    rpc('dp_adviser_note', { p_booking: bookingId, p_note: note, p_questions: questions }),
  setLounge: (l: Lounge) => rpc('dp_set_lounge', { p_seats_free: l.seatsFree, p_mood: l.mood, p_coffee: l.coffee }),
  /** Redeems a member's check-in code (scanned or typed). Each code works once. */
  async checkIn(code: string): Promise<CheckedIn> {
    const r = await rpc<{ member_no: string; name: string; drink: string }>('dp_check_in', { p_code: code });
    return { memberNo: r.member_no, name: r.name, drink: r.drink };
  },
};
