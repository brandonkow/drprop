/**
 * What each zone is for and what is in it: from the brief (§4, §6) and the fit-out in
 * blender/build_store.py.
 */
import type { Setting, ZoneKey } from './data.ts';

export interface ZoneCopy {
  name: string;
  /** One line: what happens here. */
  role: string;
  fitout: string[];
  /** Seats a guest can take here (for the occupancy bar); 0: not a waiting place. */
  seats: number;
}

export const ZONES: Record<ZoneKey, ZoneCopy> = {
  entrance: {
    name: 'Entrance',
    role: 'A glass pivot door. The fee plate is on the pier beside it, so anyone can see the prices before they walk in.',
    fitout: ['Glass pivot door, bronze frame', 'Brass fee plate and opening hours', 'Window: one table, one lamp, a section of the apothecary'],
    seats: 0,
  },
  reception: {
    name: 'Reception',
    role: 'No high counter. The front desk stands beside a walnut slab, welcomes each guest and hands over a cold towel.',
    fitout: ['Walnut slab on two travertine pedestals', 'Cold towels on a bronze tray', 'Long bronze bar pendant', 'Fluted walnut wall with a bench'],
    seats: 2,
  },
  brief: {
    name: 'Market brief',
    role: "This month's market brief, printed, on a long walnut table. Booked guests wait here; anyone can take one.",
    fitout: ['Walnut table and bench', 'Brief booklets with charts', 'Bronze stand', 'Two dome pendants'],
    seats: 2,
  },
  lounge: {
    name: 'Lounge',
    role: 'Members drop in any time: kopi, kuih and the market talk. Walk-ins wait here for a free room. No sales pitch.',
    fitout: ['Curved bouclé sofa', 'Two linen lounge chairs on walnut sleds', 'Travertine drum table, wool rug', 'Washi floor lantern', 'Pulse Roof relief on linen'],
    seats: 4,
  },
  apothecary: {
    name: 'Apothecary wall',
    role: 'Drinks and snacks in walnut drawers, each with a prescription label: Rx · Kopi Tarik, Rx · Kuih Seri Muka.',
    fitout: ['Twenty drawers with bronze label frames', 'Brass knobs', 'Lit shelves of glass jars', "Today's kopi: Kopi Tarik (Ipoh beans)"],
    seats: 0,
  },
  pantry: {
    name: 'Pantry',
    role: 'Kopi is made here and carried out by a consultant, who says hello on the way.',
    fitout: ['Espresso machine', 'Brass kopi kettle', 'Cups on a tray and on the shelf', 'Towel chiller', 'Walnut and veined travertine'],
    seats: 0,
  },
  booth: {
    name: 'Urgent booth',
    role: 'One square metre, felt-lined. The advisor calls back urgent cases by video within two hours.',
    fitout: ['Fluted walnut outside, felt inside', 'Reeded glass door', 'Screen and camera for the call'],
    seats: 0,
  },
  consult_a: {
    name: 'Consult room A',
    role: '30 minutes at a round table. The guest leaves with a written diagnosis: risks, questions to ask, next steps.',
    fitout: ['Round walnut table on a tulip base', 'Three linen chairs', 'Analysis screen with the Pulse Roof line', 'Opal globe pendant', 'Credenza, acoustic panel'],
    seats: 0,
  },
  consult_b: {
    name: 'Consult room B',
    role: 'Like room A, with its own door to the side lane: private clients come and go without passing the Lounge.',
    fitout: ['Round walnut table on a tulip base', 'Three linen chairs', 'Analysis screen with the Pulse Roof line', 'Opal globe pendant', 'Private door to the side lane'],
    seats: 0,
  },
  private: {
    name: 'Private entrance',
    role: 'By appointment: in by the side lane, straight to consult room B.',
    fitout: ['Bronze plaque', 'Sconce', 'Door straight into room B'],
    seats: 0,
  },
};

export function privateRole(setting: Setting): string {
  return setting === 'mall'
    ? 'By appointment: in from the service corridor, straight to consult room B.'
    : ZONES.private.role;
}

export const STORE = {
  name: 'Dr Prop',
  hours: 'Tue–Sun 10:00–20:00',
  members: 300,
};
