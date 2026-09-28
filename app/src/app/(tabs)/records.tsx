import React from 'react';
import { router } from 'expo-router';
import { Button, Copy, Rule, Screen, Section } from '../../components/ui';
import { useDemo } from '../../state/demo';
import { consultationTypes } from '../../domain/booking';
export default function Records() {
  const { state, loadSample } = useDemo(); const records = [...state.consultations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Screen eyebrow="YOUR CASE HISTORY" title="Records.">{!records.length && <Section><Copy kind="heading">No records yet.</Copy><Copy>A clean bill of health.</Copy><Button solid title="Start a consultation" onPress={() => router.push('/booking')} /></Section>}{records.map(item => <Section key={item.id}><Copy kind="label">{new Date(item.scheduledAt).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' })} / {item.status.toUpperCase()}</Copy><Copy kind="heading">{item.property}</Copy><Copy kind="small">{consultationTypes.find(type => type.id === item.type)?.title} · simulated payment</Copy><Button title="Open record" onPress={() => router.push({ pathname: '/record/[id]', params: { id: item.id } })} /><Rule /></Section>)}{!records.some(item => item.id === 'sample-case') && <Section><Copy kind="small">Explore a completed diagnosis using a clearly fictional case.</Copy><Button title="Load fictional sample record" onPress={loadSample} /></Section>}</Screen>;
}
