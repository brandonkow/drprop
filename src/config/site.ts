/** Null means unconfirmed. Do not replace with invented business information. */
export const site: {
  whatsappNumber: string | null;
  address: string | null;
  hours: string | null;
  mapsUrl: string | null;
  ssmNumber: string | null;
  loungeImage: { src: string; alt: string } | null;
  loungeModel: string | null;
  memberCapProposal: number;
} = {
  whatsappNumber: null, // Malaysian number, digits only, beginning 60.
  address: null,
  hours: null,
  mapsUrl: null,
  ssmNumber: null,
  loungeImage: null, // e.g. { src: '/images/lounge.webp', alt: 'The Dr Prop lounge' }
  loungeModel: '/models/store.glb', // Explicitly labelled concept; replace only with approved geometry.
  memberCapProposal: 300,
};
