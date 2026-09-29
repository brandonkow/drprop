import React, { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { Button, Choice, Copy, Field, Message, Screen, Section } from '../components/ui';
import { bands, money } from '../domain/booking';
import type { ConsultationType, PriceBand } from '../domain/models';
import { api, errorMessage, malaysiaTime, type Booking, type Slot } from './api';
type Props = { service: ReturnType<typeof api>; records: Booking[]; onClose(): void; onBooked(booking: Booking): void };
export function BookingFlow({ service, records, onClose, onBooked }: Props) {
  const [step, setStep] = useState(0); const [type, setType] = useState<ConsultationType>('clinic'); const [band, setBand] = useState<PriceBand>('lt300k');
  const [property, setProperty] = useState(''); const [follow, setFollow] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]); const [slot, setSlot] = useState<Slot | null>(null); const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const active = useRef(false); const request = useRef(randomUUID());
  const completed = records.filter(record => record.status === 'completed' && record.consultation_type !== 'review');
  function changed() { request.current = randomUUID(); setError(''); setFee(null); }
  async function next() {
    if (active.current) return; setError('');
    if (step === 0 && type === 'review' && !follow) { setError('Choose your completed consultation.'); return; }
    if (step === 1 && !property.trim()) { setError('Give the property a short name.'); return; }
    if (step === 2 && !slot) { setError('Choose an available appointment.'); return; }
    active.current = true; setBusy(true);
    try {
      if (step === 1) { setSlots(await service.slots(type)); setSlot(null); }
      if (step === 2) setFee(await service.quote(type, band));
      if (step === 3) {
        if (!slot || fee === null) throw new Error('Review the appointment and fee again.');
        onBooked(await service.book(request.current, slot.id, type, band, property.trim(), follow, fee)); return;
      }
      setStep(value => value + 1);
    } catch (issue) { setError(errorMessage(issue)); }
    finally { active.current = false; setBusy(false); }
  }
  return <Screen eyebrow={`CONSULTATION / ${step + 1} OF 4`} title={['What brings you in?', 'A little context.', 'Make time for clarity.', 'Everything, in the open.'][step]}>
    {step === 0 && <>{(['clinic', 'urgent', 'review'] as const).map(value => <Choice key={value} title={{ clinic: 'Standard consultation', urgent: 'Urgent consultation', review: 'Final check' }[value]} detail={{ clinic: 'A 30-minute consultation.', urgent: 'An available appointment within two hours.', review: 'A follow-up to a completed consultation.' }[value]} selected={value === type} onPress={() => { changed(); setType(value); setFollow(null); setSlot(null); }} />)}{type === 'review' && <Section><Copy kind="label">COMPLETED CONSULTATION</Copy>{!completed.length && <Copy>No eligible completed consultations yet.</Copy>}{completed.map(record => <Choice key={record.id} title={record.property_label} selected={follow === record.id} onPress={() => { changed(); setFollow(record.id); setBand(record.price_band); setProperty(record.property_label); }} />)}</Section>}</>}
    {step === 1 && <><Field label="Property shorthand" value={property} onChangeText={value => { changed(); setProperty(value); }} maxLength={80} /><Copy kind="small">A short label is enough. Avoid personal identifiers or a full address.</Copy><Copy kind="label">PROPERTY PRICE BAND</Copy>{bands.map(item => <Choice key={item.id} title={item.label} selected={band === item.id} disabled={type === 'review'} onPress={() => { changed(); setBand(item.id); }} />)}<Copy kind="small">Document upload is not available in this release.</Copy></>}
    {step === 2 && <><Copy>Published adviser availability, shown in Malaysia time.</Copy>{slots.length === 0 && <Message>No appointments are available for this service. Please check again later.</Message>}{slots.map(item => <Choice key={item.id} title={malaysiaTime(item.starts_at)} detail={item.adviser_name} selected={slot?.id === item.id} onPress={() => { changed(); setSlot(item); }} />)}<Button title="Refresh availability" disabled={busy} onPress={() => { if (active.current) return; active.current = true; setBusy(true); void service.slots(type).then(value => { setSlots(value); setSlot(null); }).catch(issue => setError(errorMessage(issue))).finally(() => { active.current = false; setBusy(false); }); }} /></>}
    {step === 3 && <><Copy kind="heading">{property}</Copy><Copy>{slot ? malaysiaTime(slot.starts_at) : ''}</Copy><Copy>{slot?.adviser_name}</Copy><Copy kind="label">CONSULTATION FEE</Copy><Copy kind="number">{fee === null ? 'Unavailable' : money(fee / 100)}</Copy><Copy>Your request reserves this appointment while the adviser reviews it.</Copy><Copy kind="small">No payment is collected here. A requested appointment is not yet adviser-confirmed. Payment and report delivery are not available in this release.</Copy></>}
    {error ? <Message>{error}</Message> : null}<Section><Button solid title={busy ? 'Please wait…' : step === 3 ? 'Request appointment' : 'Continue'} disabled={busy || (step === 2 && !slots.length)} onPress={() => void next()} /><Button title={step === 0 ? 'Cancel booking' : 'Back'} disabled={busy} onPress={() => { setError(''); if (step === 0) onClose(); else setStep(value => value - 1); }} /></Section>
  </Screen>;
}
