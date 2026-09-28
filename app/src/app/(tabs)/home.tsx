import React from 'react';
import { router } from 'expo-router';
import { Button, Copy, Rule, Screen, Section } from '../../components/ui';
import { Pulse } from '../../components/Pulse';
import { demoStore, useDemo } from '../../state/demo';
export default function Home() {
  const { state } = useDemo(); const hour = new Date().getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return <Screen eyebrow="YOUR PROPERTY CLINIC" title={`${greeting}, ${state.user?.displayName}.`}><Copy>Take your time. A good decision begins with a little clarity.</Copy><Pulse animate /><Button solid title="Start a consultation" onPress={() => router.push('/booking')} /><Section><Copy kind="label">IN THE LOUNGE / DEMO SNAPSHOT</Copy><Copy kind="heading">A little room to breathe.</Copy><Copy>{demoStore.loungeSeatsFree} seats free. It is quiet today.</Copy><Rule /><Copy kind="label">TODAY'S COFFEE</Copy><Copy>{demoStore.todaysCoffee}</Copy><Copy kind="small">Sample availability and menu. The store and opening hours are not yet confirmed.</Copy><Button title="View your membership card" onPress={() => router.push('/membership')} /></Section></Screen>;
}
