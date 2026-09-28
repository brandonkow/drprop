export type ConsultationType = 'clinic' | 'urgent' | 'review';
export type PriceBand = 'lt300k' | '300k-600k' | '600k-1m' | '1m-2m' | 'gt2m';
export type User = { id: string; phone: string; displayName: string; drinkPreference: string; language: 'en' };
export type Membership = { userId: string; storeId: string; memberNo: string; status: 'active' | 'waitlist' | 'expired'; renewsAt: string | null };
export type Attachment = { name: string; size: number; mimeType: string };
export type Consultation = {
  id: string; userId: string; type: ConsultationType; priceBand: PriceBand; fee: number;
  property: string; createdAt: string; scheduledAt: string; status: 'booked' | 'done' | 'cancelled';
  reportUrl?: string; advisorNote?: string; questions: string[]; attachments: Attachment[];
  payment: 'simulated'; followUpOf?: string;
};
export type Store = { id: string; name: string; address: string | null; hours: string | null; memberCap: number; memberCount: number; loungeSeatsFree: number; todaysCoffee: string; demo: true };
export type DemoState = { version: 1; user: User | null; membership: Membership | null; consultations: Consultation[]; theme: 'system' | 'light' | 'dark' };
export type BookingDraft = { type: ConsultationType; priceBand: PriceBand; property: string; scheduledAt: string; attachments: Attachment[]; followUpOf?: string };
