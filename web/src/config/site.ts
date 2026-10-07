/**
 * Everything that must be replaced with real details before launch lives here.
 * Values marked PLACEHOLDER are not real (brief §11).
 */
export const site = {
  /** WhatsApp Business number, digits only with country code. PLACEHOLDER. */
  whatsapp: '60XXXXXXXXX',

  /**
   * Public origin, e.g. 'https://drprop.my'. Enables canonical and hreflang tags, the
   * share image (og:image needs an absolute URL) and the business details for search
   * engines. Set it last, at launch, once every PLACEHOLDER here is real.
   */
  origin: null as string | null,

  /** SSM registration number shown in the footer. PLACEHOLDER. */
  ssm: 'SSM 000000000000 (0000000-X)',

  store: {
    city: 'Petaling Jaya',
    /** Street address. PLACEHOLDER until the first store is signed. */
    address: 'Jalan —, 46000 Petaling Jaya, Selangor',
    /** External Google Maps link (not embedded). PLACEHOLDER. */
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Petaling+Jaya',
    opens: '10:00',
    closes: '20:00',
    /** Member places at this store (brief §3.3 suggests 300; to be confirmed). */
    memberCap: 300,
    /**
     * Places still open. Shown only when set — never publish an invented number.
     * Example from the brief: 42.
     */
    memberPlacesLeft: null as number | null,
    /**
     * §4 image, or null for the apothecary line drawing. Files live in web/public as
     * `${base}-${width}.webp` and `.jpg` for each width; `kind` picks the caption.
     * Now: the concept render of the Lounge (brand/renders/ai/shophouse-lounge-photoreal.jpg,
     * cropped to 3:2). When the store is photographed, swap the files and set kind: 'photo'.
     */
    image: {
      base: '/store/lounge',
      widths: [800, 1600],
      width: 1600,
      height: 1067,
      kind: 'render',
    } as StoreImage | null,
  },

  /** Date the terms page was last changed (ISO). Update with any change to the terms. */
  termsUpdated: '2026-10-07',
} as const;

export interface StoreImage {
  /** Public path without the width and extension. */
  base: string;
  /** Widths available, smallest first. */
  widths: readonly number[];
  /** Intrinsic size of the largest file. */
  width: number;
  height: number;
  kind: 'render' | 'photo';
}

/**
 * What still stands between the site and launch. The build refuses to ship with
 * any of these once `origin` is set (vite.config.ts), so a placeholder number can
 * never become the live booking link.
 */
export function launchProblems(s: { whatsapp: string; ssm: string; store: { address: string; mapsUrl: string } } = site): string[] {
  const out: string[] = [];
  if (!/^60\d{8,11}$/.test(s.whatsapp)) out.push('site.whatsapp: the real WhatsApp Business number, digits only, starting 60');
  if (/0{6,}|X\)/.test(s.ssm)) out.push('site.ssm: the real SSM registration number');
  if (s.store.address.includes('—')) out.push('site.store.address: the street address');
  if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\//.test(s.store.mapsUrl) || s.store.mapsUrl.includes('query=Petaling+Jaya')) {
    out.push('site.store.mapsUrl: the Google Maps link to the store');
  }
  return out;
}

export const whatsappUrl = (message: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
