/**
 * Everything that must be replaced with real details before launch lives here.
 * Values marked PLACEHOLDER are not real (brief §11).
 */
export const site = {
  /** WhatsApp Business number, digits only with country code. PLACEHOLDER. */
  whatsapp: '60XXXXXXXXX',

  /**
   * Public origin, e.g. 'https://drprop.my'. Enables canonical and hreflang tags.
   * Left null until the domain is confirmed.
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
     * §4 image. Null shows the apothecary line drawing. Once the Blender model is
     * refined (blender/build_store.py --render) or the store is photographed, put
     * the file in web/public/ and set e.g. { src: '/store.jpg', kind: 'render' }.
     */
    image: null as { src: string; kind: 'render' | 'photo' } | null,
  },
} as const;

export const whatsappUrl = (message: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
