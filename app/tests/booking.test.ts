import assert from 'node:assert/strict';
import test from 'node:test';
import { appointmentOptions, attachmentError, bookingError, feeFor, normalizePhone } from '../src/domain/booking.ts';
import type { BookingDraft, Consultation } from '../src/domain/models.ts';
const now = Date.parse('2026-09-29T03:00:00Z');
const draft: BookingDraft = { type: 'clinic', priceBand: '300k-600k', property: 'Fictional terrace', scheduledAt: '2026-09-30T03:00:00Z', attachments: [] };
test('fees retain cents for urgent and half-price follow-up proposals', () => { assert.equal(feeFor('clinic', 'gt2m'), 1999); assert.equal(feeFor('urgent', '300k-600k'), 598.5); assert.equal(feeFor('review', 'lt300k'), 99.5); });
test('booking rejects stale times and unlinked or mismatched final checks', () => {
  assert.equal(bookingError(draft, [], now), null);
  assert.match(bookingError({ ...draft, scheduledAt: '2026-09-01' }, [], now)!, /future/);
  assert.match(bookingError({ ...draft, type: 'review' }, [], now)!, /completed/);
  const done = { ...draft, id: 'case', status: 'done' } as Consultation;
  assert.equal(bookingError({ ...draft, type: 'review', followUpOf: 'case' }, [done], now), null);
  assert.match(bookingError({ ...draft, type: 'review', followUpOf: 'case', priceBand: 'gt2m' }, [done], now)!, /price band/);
});
test('urgent callback must fall within two hours', () => { assert.match(bookingError({ ...draft, type: 'urgent' }, [], now)!, /window/); assert.equal(bookingError({ ...draft, type: 'urgent', scheduledAt: new Date(now + 7200_000).toISOString() }, [], now), null); });
test('files must be supported and no larger than 10 MB', () => { assert.equal(attachmentError({ name: 'sample.pdf', size: 300, mimeType: 'application/pdf' }), null); assert.match(attachmentError({ name: 'large.pdf', size: 11 * 1024 * 1024, mimeType: 'application/pdf' })!, /10 MB/); assert.match(attachmentError({ name: 'run.exe', size: 100, mimeType: 'application/octet-stream' })!, /Choose/); });
test('phone formatting and Malaysian-time slots are deterministic', () => { assert.equal(normalizePhone('+60 12-345 6789'), '+60123456789'); assert.equal(normalizePhone('not a phone'), null); const slots = appointmentOptions(new Date('2026-09-27T18:00:00Z')); assert.equal(slots.length, 6); assert.ok(slots.every(slot => Date.parse(slot.value) > Date.parse('2026-09-27T18:00:00Z'))); assert.ok(slots.every(slot => slot.label.endsWith('MYT'))); });
