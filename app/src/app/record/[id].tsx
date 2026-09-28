import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { Button, Copy, Message, Rule, Screen, Section } from '../../components/ui';
import { useDemo } from '../../state/demo';
import { consultationTypes, money } from '../../domain/booking';
export default function Record() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { state, cancel } = useDemo(); const item = state.consultations.find(record => record.id === id); const [message, setMessage] = useState(''); const [confirmCancel, setConfirmCancel] = useState(false);
  async function report() {
    try {
      const asset = Asset.fromModule(require('../../assets/sample-diagnosis.pdf')); await asset.downloadAsync();
      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) await Sharing.shareAsync(asset.localUri ?? asset.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      else await Linking.openURL(asset.uri);
    } catch { setMessage('The sample PDF could not be opened on this device. Its diagnosis is also shown below.'); }
  }
  if (!item) return <Screen title="Record unavailable."><Copy>This record is not in your local preview.</Copy><Button title="Back to Records" onPress={() => router.replace('/(tabs)/records')} /></Screen>;
  return <Screen eyebrow={`${item.status.toUpperCase()} / PREVIEW RECORD`} title={item.property}><Copy>{consultationTypes.find(type => type.id === item.type)?.title}</Copy><Copy>{new Date(item.scheduledAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT</Copy><Copy kind="number">{money(item.fee)}</Copy><Copy kind="small">Simulated payment. No money collected.</Copy><Rule />
    {item.status === 'done' ? <>
      <Copy kind="heading">Your diagnosis.</Copy><Copy>{item.advisorNote}</Copy>
      <Button title="Open sample PDF report" onPress={() => void report()} />
      <Section><Copy kind="label">QUESTIONS TO TAKE AWAY</Copy>{item.questions.map((question, i) => <Copy key={question}>{String(i + 1).padStart(2, '0')} / {question}</Copy>)}</Section>
      {item.type !== 'review' && <Button solid title="Book a final check" onPress={() => router.push({ pathname: '/booking', params: { followUp: item.id } })} />}
    </> : <Copy>{item.status === 'cancelled' ? 'This preview booking was cancelled. No refund is necessary.' : 'A diagnosis appears here after a completed consultation. This mock booking does not create an adviser appointment.'}</Copy>}
    {!!item.attachments.length && <Section><Copy kind="label">ATTACHMENT METADATA</Copy>{item.attachments.map((file, i) => <Copy kind="small" key={`${file.name}-${i}`}>{file.name} · {Math.ceil(file.size / 1024)} KB · file contents not stored</Copy>)}</Section>}
    {message && <Message>{message}</Message>}<Section>{item.status === 'booked' && <>{confirmCancel ? <><Copy>Cancel this simulated booking?</Copy><Button title="Confirm cancellation" onPress={() => { cancel(item.id); setConfirmCancel(false); }} /><Button title="Keep booking" onPress={() => setConfirmCancel(false)} /></> : <Button title="Cancel this booking" onPress={() => setConfirmCancel(true)} />}</>}<Button title="Back to Records" onPress={() => router.replace('/(tabs)/records')} /></Section>
  </Screen>;
}
