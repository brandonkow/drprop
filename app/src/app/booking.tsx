import React, { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Button, Choice, Copy, Field, Message, Rule, Screen, Section } from '../components/ui';
import { Pulse } from '../components/Pulse';
import { useDemo } from '../state/demo';
import { appointmentOptions, attachmentError, bands, bookingError, consultationTypes, feeFor, money } from '../domain/booking';
import type { BookingDraft, Consultation } from '../domain/models';
export default function Booking() {
  const { state, book } = useDemo(); const { followUp } = useLocalSearchParams<{ followUp?: string }>();
  const original = state.consultations.find(item => item.id === followUp && item.status === 'done' && item.type !== 'review');
  const [step, setStep] = useState(0); const [error, setError] = useState(''); const [success, setSuccess] = useState<Consultation | null>(null); const busy = useRef(false);
  const [draft, setDraft] = useState<BookingDraft>({ type: original ? 'review' : 'clinic', priceBand: original?.priceBand ?? 'lt300k', property: original?.property ?? '', scheduledAt: '', attachments: [], followUpOf: original?.id });
  const [slots] = useState(() => appointmentOptions());
  const completed = state.consultations.filter(item => item.status === 'done' && item.type !== 'review');
  function update(patch: Partial<BookingDraft>) { setError(''); setDraft(value => ({ ...value, ...patch })); }
  async function attach() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], multiple: true, copyToCacheDirectory: false });
      if (picked.canceled) return;
      const files = picked.assets.map(file => ({ name: file.name, size: file.size ?? 0, mimeType: file.mimeType ?? 'application/octet-stream' }));
      if (draft.attachments.length + files.length > 3) { setError('Attach no more than three files.'); return; }
      const issue = files.map(attachmentError).find(Boolean); if (issue) { setError(issue); return; }
      update({ attachments: [...draft.attachments, ...files] });
    } catch { setError('The file picker is unavailable. You can continue without attachments.'); }
  }
  function next() {
    setError('');
    if (step === 0 && draft.type === 'review' && !draft.followUpOf) { setError('Choose a completed consultation for this final check.'); return; }
    if (step === 1 && !draft.property.trim()) { setError('Give this property a short name.'); return; }
    const timed = draft.type === 'urgent' ? { ...draft, scheduledAt: new Date(Date.now() + 2 * 3600_000 - 1000).toISOString() } : draft;
    if (step === 2 || step === 3) { const issue = bookingError(timed, state.consultations); if (issue) { setError(issue); return; } setDraft(timed); }
    if (step < 3) { setStep(step + 1); return; }
    if (busy.current) return; busy.current = true;
    try { const record = book(timed); setSuccess(record); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'The preview booking could not be saved.'); }
    finally { busy.current = false; }
  }
  if (success) return <Screen eyebrow="PREVIEW CONFIRMED" title="A little more clarity awaits."><Pulse animate /><Copy>Your simulated {consultationTypes.find(type => type.id === success.type)?.title.toLowerCase()} is saved.</Copy><Copy kind="number">{money(success.fee)}</Copy><Copy>No payment was collected and no adviser was booked.</Copy><Copy kind="small">{success.type === 'urgent' ? 'Demo callback window ends ' : 'Demo appointment: '}{new Date(success.scheduledAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT</Copy><Section><Button solid title="View booking record" onPress={() => router.replace({ pathname: '/record/[id]', params: { id: success.id } })} /><Button title="Back to Home" onPress={() => router.replace('/(tabs)/home')} /></Section></Screen>;
  return <Screen eyebrow={`CONSULTATION / ${step + 1} OF 4`} title={['What brings you in?', 'A little context.', 'Make time for clarity.', 'Everything, in the open.'][step]}>
    {step === 0 && <>{consultationTypes.map(type => <Choice key={type.id} title={type.title} detail={type.detail} selected={draft.type === type.id} onPress={() => update({ type: type.id, scheduledAt: '', followUpOf: type.id === 'review' ? draft.followUpOf : undefined })} />)}{draft.type === 'review' && <Section><Copy kind="label">COMPLETED CONSULTATION</Copy>{!completed.length && <Copy>No completed consultations yet. Load the fictional sample from Records to try a final check.</Copy>}{completed.map(item => <Choice key={item.id} title={item.property} selected={draft.followUpOf === item.id} onPress={() => update({ followUpOf: item.id, priceBand: item.priceBand, property: item.property })} />)}</Section>}</>}
    {step === 1 && <><Field label="Property shorthand" value={draft.property} onChangeText={property => update({ property })} maxLength={80} placeholder="e.g. Terrace near the park" /><Copy kind="small">Use a fictional name in this preview. An exact price or address is unnecessary.</Copy><Copy kind="label">PROPERTY PRICE BAND</Copy>{bands.map(band => <Choice key={band.id} title={band.label} detail={money(feeFor(draft.type, band.id))} selected={draft.priceBand === band.id} disabled={draft.type === 'review' && draft.priceBand !== band.id} onPress={() => update({ priceBand: band.id })} />)}<Section><Copy kind="label">OPTIONAL DOCUMENTS</Copy><Copy kind="small">Try a sample PDF or image. Only its name, type and size are saved locally; file contents are neither saved nor uploaded. Maximum three files, 10 MB each.</Copy><Button title="Choose sample documents" onPress={() => void attach()} />{draft.attachments.map((file, index) => <Button key={`${file.name}-${index}`} title={`Remove ${file.name}`} onPress={() => update({ attachments: draft.attachments.filter((_, i) => i !== index) })} />)}</Section></>}
    {step === 2 && (draft.type === 'urgent' ? <><Copy kind="heading">A callback within two hours.</Copy><Copy>We would call {state.user?.phone} for a video consultation.</Copy><Copy kind="small">This is a simulated callback window. No call will be placed.</Copy></> : <><Copy>Sample availability, shown in Malaysia time.</Copy>{slots.map(slot => <Choice key={slot.value} title={slot.label} selected={draft.scheduledAt === slot.value} onPress={() => update({ scheduledAt: slot.value })} />)}</>)}
    {step === 3 && <><Copy kind="heading">{consultationTypes.find(type => type.id === draft.type)?.title}</Copy><Copy>{draft.property}</Copy><Copy>{bands.find(band => band.id === draft.priceBand)?.label}</Copy><Copy>{draft.type === 'urgent' ? 'Video callback within two hours' : new Date(draft.scheduledAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) + ' MYT'}</Copy><Rule /><Copy kind="label">PROPOSED CONSULTATION FEE</Copy><Copy kind="number">{money(feeFor(draft.type, draft.priceBand))}</Copy><Copy>A written diagnosis and clear next steps are included.</Copy><Copy kind="small">{draft.attachments.length} sample attachment(s). Preview payment only: no card details, bank account or money transfer. Published fees and service terms await confirmation.</Copy></>}
    {error && <Message>{error}</Message>}<Section><Button solid title={step === 3 ? 'Confirm simulated payment' : 'Continue'} onPress={next} /><Button title={step === 0 ? 'Cancel booking' : 'Back'} onPress={() => { if (step === 0) router.replace('/(tabs)/home'); else { setStep(step - 1); setError(''); } }} /></Section>
  </Screen>;
}
