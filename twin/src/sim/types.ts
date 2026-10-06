/**
 * The kinds of customer the store serves (brief §3, §4) and what each visit goes
 * through. One table drives the 3D figures, the stepper, the bookings table and the
 * fees, so a new kind of customer is one entry here plus its route in planner.ts.
 */
import type { ConsultType, PriceBand } from '@drprop/brand/pricing';

export type CustomerType = 'walkin' | 'member' | 'booked' | 'private' | 'urgent' | 'review';
export type StaffKey = 'host' | 'consultant_a' | 'consultant_b' | 'advisor';

/** Milestones a visit can reach; each type uses some of them, in this order. */
export type Milestone =
  | 'booked'
  | 'requested'
  | 'arrived'
  | 'welcomed'
  | 'snack'
  | 'waiting'
  | 'lounge'
  | 'kopi'
  | 'callback'
  | 'consult'
  | 'consult_end'
  | 'left'
  | 'diagnosis';

export interface TypeSpec {
  label: string;
  /** One line for the legend and the detail panel. */
  blurb: string;
  /** Fee rule from brand/pricing.ts; null: no fee (Lounge members). */
  fee: ConsultType | null;
  /** Minutes in the room (0: no consult). */
  consult: number;
  /** Clothes of the figure and the colour of its ring and route. */
  top: string;
  trousers: string;
  ring: string;
  /** The visit as steps for the tracker: [milestone, label]. */
  steps: [Milestone, string][];
  /** Known before they arrive (booked in the app) or only when they walk in. */
  announced: boolean;
}

export const TYPES: Record<CustomerType, TypeSpec> = {
  walkin: {
    label: 'Walk-in',
    blurb: 'First visit, no booking. Cold towel, a seat in the Lounge, then a consult when a room is free.',
    fee: 'clinic',
    consult: 30,
    top: '#A88462',
    trousers: '#5B4A3A',
    ring: '#8C6A43',
    steps: [
      ['arrived', 'Walked in'],
      ['welcomed', 'Cold towel'],
      ['lounge', 'Lounge · kopi'],
      ['consult', 'Consult · 30 min'],
      ['diagnosis', 'Written diagnosis'],
    ],
    announced: false,
  },
  member: {
    label: 'Member',
    blurb: 'Lounge member dropping in. Greeted by name, a snack from the apothecary, kopi, the market brief. No fee.',
    fee: null,
    consult: 0,
    top: '#B9A88E',
    trousers: '#4A4239',
    ring: '#A39478',
    steps: [
      ['arrived', 'Walked in'],
      ['welcomed', 'Greeted by name'],
      ['snack', 'Apothecary'],
      ['lounge', 'Lounge · kopi'],
      ['left', 'Market brief, out'],
    ],
    announced: false,
  },
  booked: {
    label: 'Booked consult',
    blurb: 'Booked in the app. Waits at the market-brief table, then 30 minutes in a consult room.',
    fee: 'clinic',
    consult: 30,
    top: '#7D8A84',
    trousers: '#3F4643',
    ring: '#5E6B66',
    steps: [
      ['booked', 'Booked in the app'],
      ['arrived', 'Arrived'],
      ['waiting', 'Market-brief table'],
      ['consult', 'Consult · 30 min'],
      ['diagnosis', 'Written diagnosis'],
    ],
    announced: true,
  },
  private: {
    label: 'Private',
    blurb: 'By appointment, in by the side door straight to consult room B. Never passes the Lounge.',
    fee: 'clinic',
    consult: 30,
    top: '#5D6970',
    trousers: '#2F3437',
    ring: '#47525A',
    steps: [
      ['booked', 'Booked · private'],
      ['arrived', 'Side door'],
      ['consult', 'Room B · 30 min'],
      ['left', 'Out the same way'],
      ['diagnosis', 'Written diagnosis'],
    ],
    announced: true,
  },
  urgent: {
    label: 'Urgent video',
    blurb: 'Deciding today. The advisor calls back by video within two hours, from the booth. +50%.',
    fee: 'urgent',
    consult: 20,
    top: '#4E4A44',
    trousers: '#2A2825',
    ring: '#6F6557',
    steps: [
      ['requested', 'Requested in the app'],
      ['callback', 'Advisor calls back'],
      ['consult', 'Video consult · 20 min'],
      ['diagnosis', 'Written diagnosis'],
    ],
    announced: true,
  },
  review: {
    label: 'Pre-signing review',
    blurb: 'Has a diagnosis already. A 15-minute check before paying the deposit. Half price.',
    fee: 'review',
    consult: 15,
    top: '#C9B79A',
    trousers: '#6B5E4E',
    ring: '#9C8B72',
    steps: [
      ['booked', 'Booked in the app'],
      ['arrived', 'Arrived'],
      ['consult', 'Review · 15 min'],
      ['diagnosis', 'Diagnosis updated'],
    ],
    announced: true,
  },
};

export const TYPE_KEYS = Object.keys(TYPES) as CustomerType[];

export const STAFF: Record<StaffKey, { label: string; top: string; trousers: string; home: string }> = {
  host: { label: 'Front desk', top: '#CFC6B6', trousers: '#3C3833', home: 'reception_host' },
  consultant_a: { label: 'Consultant A', top: '#2A2825', trousers: '#1E1D1B', home: 'consult_a_0' },
  consultant_b: { label: 'Consultant B', top: '#3B3833', trousers: '#24221F', home: 'consult_b_0' },
  advisor: { label: 'Urgent advisor', top: '#4E4A44', trousers: '#2A2825', home: 'booth' },
};

export interface Visit {
  id: string;
  type: CustomerType;
  /** Minutes from opening: arrival (walk-ins, members), slot (bookings), request (urgent). */
  at: number;
  band: PriceBand;
  /** What it is about, in a few words. */
  note: string;
  /** Added from the dashboard rather than the sample day. */
  added?: boolean;
}

export const BAND_LABEL: Record<PriceBand, string> = {
  lt300k: '≤ RM 300k',
  '300k-600k': 'RM 300k–600k',
  '600k-1m': 'RM 600k–1M',
  '1m-2m': 'RM 1M–2M',
  gt2m: '> RM 2M',
};
