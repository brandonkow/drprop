import React, { useEffect, useRef, useState } from 'react';
import { Button, Copy, Field, Message, Screen, Section } from '../components/ui';
import { api, errorMessage, malaysiaTime, type StaffBooking, type StaffSlot } from './api';
import { parseMalaysiaSlot } from './schedule-time';
export function StaffSchedule({ service, userId, onClose }: { service: ReturnType<typeof api>; userId: string; onClose(): void }) {
  const [slots, setSlots] = useState<StaffSlot[]>([]); const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [start, setStart] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [cancel, setCancel] = useState('');
  const active = useRef(false); const mounted = useRef(true);
  async function refresh() { const [a, b] = await Promise.all([service.staffSlots(userId), service.staffBookings()]); if (mounted.current) { setSlots(a); setBookings(b); } }
  useEffect(() => { mounted.current = true; void refresh().catch(issue => { if (mounted.current) setError(errorMessage(issue)); }); return () => { mounted.current = false; }; }, []);
  async function act(work: () => Promise<unknown>) {
    if (active.current) return; active.current = true; setBusy(true); setError('');
    try { await work(); await refresh(); setCancel(''); } catch (issue) { setError(errorMessage(issue)); }
    finally { active.current = false; setBusy(false); }
  }
  return <Screen eyebrow="ADVISER SCHEDULE" title="Make room for a conversation."><Button title="Back to Me" onPress={onClose} /><Copy>Publish a 30-minute appointment. Times are interpreted in Malaysia time.</Copy>
    <Field label="Appointment start in Malaysia time" placeholder="YYYY-MM-DD HH:MM" value={start} onChangeText={setStart} maxLength={16} autoCapitalize="none" />
    <Button solid title="Publish appointment" disabled={busy} onPress={() => void act(() => service.publish(parseMalaysiaSlot(start)))} />
    {error ? <Message>{error}</Message> : null}<Button title="Refresh schedule" disabled={busy} onPress={() => void act(refresh)} />
    <Section><Copy kind="heading">Upcoming availability</Copy>{!slots.length && <Copy>No published appointments.</Copy>}{slots.map(item => <Section key={item.id}><Copy>{malaysiaTime(item.starts_at)}</Copy><Copy kind="small">{item.enabled ? 'Published' : 'Closed'}</Copy>{item.enabled && <Button title={`Close availability ${malaysiaTime(item.starts_at)}`} disabled={busy} onPress={() => void act(() => service.close(item.id))} />}</Section>)}</Section>
    <Section><Copy kind="heading">Assigned consultations</Copy>{!bookings.length && <Copy>No assigned consultations.</Copy>}{bookings.map(({ booking: b, customer_name, customer_phone }) => <Section key={b.id}><Copy kind="heading">{b.property_label}</Copy><Copy>{customer_name} · +{customer_phone.replace(/^\+/, '')}</Copy><Copy>{malaysiaTime(b.starts_at)}</Copy><Copy kind="label">{b.status} / {b.payment_status}</Copy>
      {b.status === 'requested' && <Button title={`Confirm ${b.property_label}`} disabled={busy} onPress={() => void act(() => service.status(b.id, 'confirmed'))} />}
      {b.status === 'confirmed' && new Date(b.ends_at).getTime() <= Date.now() && <Button title={`Complete ${b.property_label}`} disabled={busy} onPress={() => void act(() => service.status(b.id, 'completed'))} />}
      {['requested', 'confirmed'].includes(b.status) && (cancel === b.id ? <><Copy>Cancel this customer appointment?</Copy><Button title="Confirm appointment cancellation" disabled={busy} onPress={() => void act(() => service.status(b.id, 'cancelled'))} /><Button title="Keep appointment" onPress={() => setCancel('')} /></> : <Button title={`Cancel ${b.property_label}`} disabled={busy} onPress={() => setCancel(b.id)} />)}
    </Section>)}</Section>
  </Screen>;
}
