import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsultationType, PriceBand } from '../domain/models';
export type Profile = { user_id: string; display_name: string; drink_preference: string };
export type Slot = { id: string; adviser_name: string; starts_at: string; ends_at: string };
export type StaffSlot = { id: string; starts_at: string; ends_at: string; enabled: boolean };
export type Booking = { id: string; user_id: string; adviser_id: string; slot_id: string; consultation_type: ConsultationType; price_band: PriceBand; property_label: string; fee_minor: number; starts_at: string; ends_at: string; status: 'requested' | 'confirmed' | 'completed' | 'cancelled'; payment_status: 'unpaid'; follow_up_of: string | null };
export type StaffBooking = { booking: Booking; customer_name: string; customer_phone: string };
export function api(client: SupabaseClient) {
  async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> { const { data, error } = await client.rpc(name, args); if (error) throw error; return data as T; }
  async function one<T>(name: string, args: Record<string, unknown>): Promise<T> { const { data, error } = await client.rpc(name, args).single(); if (error) throw error; return data as T; }
  return {
    async profile(userId: string) { const { data, error } = await client.from('dp_profiles').select('*').eq('user_id', userId).maybeSingle(); if (error) throw error; return data as Profile | null; },
    saveProfile: (name: string, drink: string) => one<Profile>('dp_save_profile', { p_name: name, p_drink: drink }),
    async isStaff(userId: string) { const { data, error } = await client.from('dp_staff').select('enabled').eq('user_id', userId).maybeSingle(); if (error) throw error; return data?.enabled === true; },
    slots: (type: ConsultationType) => rpc<Slot[]>('dp_availability', { p_type: type }),
    quote: (type: ConsultationType, band: PriceBand) => rpc<number>('dp_quote', { p_type: type, p_band: band }),
    async bookings(userId: string) { const { data, error } = await client.from('dp_bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as Booking[]; },
    book: (request: string, slot: string, type: ConsultationType, band: PriceBand, property: string, follow: string | null, expectedFee: number) => one<Booking>('dp_book', { p_request: request, p_slot: slot, p_type: type, p_band: band, p_property: property, p_follow_up: follow, p_expected_fee: expectedFee }),
    cancel: (id: string) => one<Booking>('dp_cancel', { p_booking: id }),
    staffBookings: () => rpc<StaffBooking[]>('dp_adviser_bookings'),
    async staffSlots(userId: string) { const { data, error } = await client.from('dp_slots').select('*').eq('adviser_id', userId).gte('starts_at', new Date().toISOString()).order('starts_at').limit(200); if (error) throw error; return data as StaffSlot[]; },
    publish: (start: string) => one<StaffSlot>('dp_publish_slot', { p_start: start }),
    close: (id: string) => rpc<void>('dp_close_slot', { p_slot: id }),
    status: (id: string, status: string) => one<Booking>('dp_adviser_status', { p_booking: id, p_status: status }),
  };
}
export const errorMessage = (error: unknown) => {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : 'The request could not be completed. Please try again.';
  if (/fetch|network|timeout/i.test(message)) return 'Connection unavailable. Please retry. A booking is confirmed only when its record appears.';
  return message;
};
export const malaysiaTime = (date: string) => new Date(date).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' }) + ' MYT';
