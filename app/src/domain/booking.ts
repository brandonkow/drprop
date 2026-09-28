import type { Attachment, BookingDraft, Consultation, ConsultationType, PriceBand } from './models.ts';

export const bands: { id: PriceBand; label: string; fee: number }[] = [
  { id: 'lt300k', label: 'Up to RM 300,000', fee: 199 },
  { id: '300k-600k', label: 'Over RM 300,000 to RM 600,000', fee: 399 },
  { id: '600k-1m', label: 'Over RM 600,000 to RM 1 million', fee: 699 },
  { id: '1m-2m', label: 'Over RM 1 million to RM 2 million', fee: 1199 },
  { id: 'gt2m', label: 'Over RM 2 million', fee: 1999 },
];
export const consultationTypes = [
  { id: 'clinic' as const, title: 'Standard consultation', detail: '30 minutes. Bring your questions; leave with a written diagnosis.' },
  { id: 'urgent' as const, title: 'Urgent consultation', detail: 'A video callback within two hours. Proposed 50% surcharge.' },
  { id: 'review' as const, title: 'Final check', detail: '15 minutes before signing. Half price for a completed consultation.' },
];
export const money = (amount: number) => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export function feeFor(type: ConsultationType, band: PriceBand) {
  const base = bands.find(item => item.id === band)?.fee;
  if (base === undefined) throw new Error('Select a property price band.');
  return Math.round(base * (type === 'urgent' ? 1.5 : type === 'review' ? 0.5 : 1) * 100) / 100;
}
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[\s()-]/g, '').replace(/^\+/, '');
  return /^60\d{8,10}$/.test(digits) ? `+${digits}` : null;
}
export function attachmentError(attachment: Attachment) {
  if (attachment.size > 10 * 1024 * 1024) return 'Each file must be no larger than 10 MB.';
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(attachment.mimeType)) return 'Choose a PDF, JPG, PNG or WebP file.';
  return null;
}
export function bookingError(draft: BookingDraft, records: Consultation[], now = Date.now()) {
  if (!consultationTypes.some(item => item.id === draft.type) || !bands.some(item => item.id === draft.priceBand)) return 'Choose a consultation and price band.';
  if (!draft.property.trim() || draft.property.trim().length > 80) return 'Give this property a short name (1–80 characters).';
  if (draft.attachments.length > 3) return 'Attach no more than three files.';
  for (const file of draft.attachments) { const error = attachmentError(file); if (error) return error; }
  if (draft.type === 'review' && !records.some(item => item.id === draft.followUpOf && item.status === 'done' && item.type !== 'review' && item.priceBand === draft.priceBand)) return 'A final check must follow a completed consultation for this price band.';
  const scheduled = Date.parse(draft.scheduledAt);
  if (!Number.isFinite(scheduled) || scheduled <= now) return 'Choose a future appointment time.';
  if (draft.type === 'urgent' && scheduled > now + 2 * 60 * 60 * 1000) return 'Refresh the urgent callback window.';
  return null;
}
export function appointmentOptions(now = new Date()) {
  // Fixed clinic timezone: do not schedule a different day on an overseas device.
  const local = new Date(now.getTime() + 8 * 3600_000);
  const options: { value: string; label: string }[] = [];
  for (let offset = 1; options.length < 6; offset++) {
    const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offset));
    if (day.getUTCDay() === 1) continue;
    for (const hour of [11, 15]) {
      const date = new Date(day.getTime() + (hour - 8) * 3600_000);
      options.push({ value: date.toISOString(), label: date.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' MYT' });
    }
  }
  return options.slice(0, 6);
}
