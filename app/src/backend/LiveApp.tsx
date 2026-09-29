import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { Button, Copy, Field, Message, Screen, Section, useTheme } from '../components/ui';
import { PresentationContext } from '../state/presentation';
import { backendClient, clearSavedSignIn } from './client';
import { runtime } from './config';
import { api, errorMessage, malaysiaTime, type Booking, type Profile } from './api';
import { money } from '../domain/booking';
import { SignIn } from './SignIn';
import { BookingFlow } from './BookingFlow';
import { StaffSchedule } from './StaffSchedule';

export function LiveApp() {
  return <PresentationContext.Provider value={{ mode: 'backend', theme: 'system', storageError: '' }}>{runtime.mode !== 'supabase' ? <Screen title="Setup required."><Message>{runtime.mode === 'invalid' ? runtime.error : 'Choose a configured app mode.'}</Message></Screen> : <Connected />}</PresentationContext.Provider>;
}
function Connected() {
  const client = useMemo(backendClient, []); const t = useTheme();
  const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  const [fonts, fontError] = useFonts({
    Geist: require('@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf'),
    GeistMono: require('@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf'),
    InstrumentSerif: require('@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf'),
  });
  useEffect(() => {
    let active = true; let revision = 0;
    const { data } = client.auth.onAuthStateChange((_event, next) => { revision++; if (active) { setSession(next); setReady(true); } });
    const before = revision;
    void client.auth.getSession().then(({ data: current, error: issue }) => {
      if (!active || revision !== before) return;
      if (issue) setError(errorMessage(issue)); else setSession(current.session); setReady(true);
    }).catch(issue => { if (active) { setError(errorMessage(issue)); setReady(true); } });
    const subscription = Platform.OS !== 'web' ? AppState.addEventListener('change', state => { if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh(); }) : null;
    if (Platform.OS !== 'web' && AppState.currentState !== 'active') client.auth.stopAutoRefresh();
    return () => { active = false; data.subscription.unsubscribe(); subscription?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, [client]);
  if (!ready || (!fonts && !fontError)) return <Screen title="DR. PROP"><Copy>Preparing your session.</Copy></Screen>;
  return <><StatusBar style={t.dark ? 'light' : 'dark'} />{error ? <Screen title="Sign-in needs attention."><Message>{error}</Message><Button title="Clear saved sign-in" onPress={() => { void clearSavedSignIn().then(() => { setError(''); setSession(null); }).catch(issue => setError(errorMessage(issue))); }} /></Screen> : session ? <Workspace key={session.user.id} client={client} session={session} /> : <SignIn client={client} />}</>;
}

function Workspace({ client, session }: { client: SupabaseClient; session: Session }) {
  const service = useMemo(() => api(client), [client]); const t = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null); const [records, setRecords] = useState<Booking[]>([]); const [staff, setStaff] = useState(false);
  const [loaded, setLoaded] = useState(false); const [verified, setVerified] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [name, setName] = useState(''); const [drink, setDrink] = useState(''); const [tab, setTab] = useState<'Home' | 'Records' | 'Me'>('Home');
  const [screen, setScreen] = useState<'tabs' | 'booking' | 'staff'>('tabs'); const [busy, setBusy] = useState(false); const [cancel, setCancel] = useState(''); const [signOut, setSignOut] = useState(false);
  const active = useRef(false); const mounted = useRef(true);
  async function load() {
    const { data, error: issue } = await client.auth.getUser(); if (issue) throw issue;
    if (data.user?.id !== session.user.id || !data.user.phone_confirmed_at) throw new Error('A verified phone sign-in is required. Sign out and verify your phone.');
    const [p, r, s] = await Promise.all([service.profile(session.user.id), service.bookings(session.user.id), service.isStaff(session.user.id)]);
    if (!mounted.current) return;
    setProfile(p); setName(p?.display_name ?? ''); setDrink(p?.drink_preference ?? ''); setRecords(r); setStaff(s); setVerified(true); setLoaded(true);
  }
  useEffect(() => { mounted.current = true; void load().catch(issue => { if (mounted.current) { setError(errorMessage(issue)); setLoaded(true); } }); return () => { mounted.current = false; }; }, []);
  async function act(work: () => Promise<void>) {
    if (active.current) return; active.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (issue) { if (mounted.current) setError(errorMessage(issue)); }
    finally { active.current = false; if (mounted.current) setBusy(false); }
  }
  async function logout() { const { error: issue } = await client.auth.signOut({ scope: 'local' }); if (issue) throw issue; }
  async function save() { const p = await service.saveProfile(name, drink); setProfile(p); setNotice('Preferences saved.'); }
  if (!loaded) return <Screen title="Welcome back."><Copy>Loading your private workspace.</Copy></Screen>;
  if (!verified) return <Screen title="Connection needs attention."><Message>{error}</Message><Button title="Retry connection" disabled={busy} onPress={() => void act(load)} /><Button title="Sign out" disabled={busy} onPress={() => void act(logout)} /></Screen>;
  if (!profile) return <Screen eyebrow="WELCOME" title="What should we call you?"><Field label="Preferred name" value={name} onChangeText={setName} maxLength={40} /><Copy kind="small">This name will be visible to your assigned adviser.</Copy>{error ? <Message>{error}</Message> : null}<Button solid title="Save profile" disabled={busy || !name.trim()} onPress={() => void act(save)} /><Button title="Sign out" disabled={busy} onPress={() => void act(logout)} /></Screen>;
  if (screen === 'booking') return <BookingFlow service={service} records={records} onClose={() => setScreen('tabs')} onBooked={record => { setRecords(value => [record, ...value.filter(item => item.id !== record.id)]); setScreen('tabs'); setTab('Records'); setNotice(record.status === 'requested' ? 'Appointment requested. Waiting for adviser confirmation; no payment has been collected.' : `Existing appointment retrieved. Current status: ${record.status}.`); }} />;
  if (screen === 'staff') return <StaffSchedule service={service} userId={session.user.id} onClose={() => setScreen('tabs')} />;
  return <View style={{ flex: 1, backgroundColor: t.background }}><Screen eyebrow={tab.toUpperCase()} title={tab === 'Home' ? `Welcome, ${profile.display_name}.` : tab === 'Records' ? 'Your consultations.' : 'A little about you.'}>
    {error ? <Message>{error}</Message> : null}{notice ? <Message>{notice}</Message> : null}
    {tab === 'Home' && <><Copy>Take your time. A good decision begins with a little clarity.</Copy><Button solid title="Start a consultation" onPress={() => { setNotice(''); setScreen('booking'); }} /><Section><Copy kind="heading">Your next step</Copy><Copy>Choose a published appointment and review the current fee. Your adviser will confirm the request.</Copy><Copy kind="small">Appointments are shown in Malaysia time. Online payments, document uploads and membership access are not available in this release.</Copy></Section></>}
    {tab === 'Records' && <><Button title="Refresh records" disabled={busy} onPress={() => void act(async () => { setRecords(await service.bookings(session.user.id)); })} />{!records.length && <Copy>No consultations yet.</Copy>}{records.map(record => <Section key={record.id}><Copy kind="heading">{record.property_label}</Copy><Copy>{malaysiaTime(record.starts_at)}</Copy><Copy kind="label">{record.status} / {record.payment_status}</Copy><Copy>{money(record.fee_minor / 100)}</Copy><Copy kind="small">Reference: {record.id}</Copy>{['requested', 'confirmed'].includes(record.status) && Date.parse(record.starts_at) > Date.now() && (cancel === record.id ? <><Copy>Cancel this appointment?</Copy><Button title="Confirm cancellation" disabled={busy} onPress={() => void act(async () => { const updated = await service.cancel(record.id); setRecords(value => value.map(item => item.id === updated.id ? updated : item)); setCancel(''); setNotice('Appointment cancelled.'); })} /><Button title="Keep appointment" onPress={() => setCancel('')} /></> : <Button title={`Cancel ${record.property_label}`} disabled={busy} onPress={() => setCancel(record.id)} />)}</Section>)}</>}
    {tab === 'Me' && <><Field label="Preferred name" value={name} onChangeText={setName} maxLength={40} /><Field label="Preferred drink" value={drink} onChangeText={setDrink} maxLength={80} /><Button solid title="Save preferences" disabled={busy || !name.trim()} onPress={() => void act(save)} /><Copy kind="small">English · Malaysia time</Copy>{staff && <Button title="Manage adviser schedule" onPress={() => setScreen('staff')} />}<Section>{signOut ? <><Copy>Sign out of this device? Your records remain in your account.</Copy><Button title="Confirm sign out" disabled={busy} onPress={() => void act(logout)} /><Button title="Stay signed in" onPress={() => setSignOut(false)} /></> : <Button title="Sign out" onPress={() => setSignOut(true)} />}</Section></>}
  </Screen><View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: t.rule, paddingBottom: 20 }}>{(['Home', 'Records', 'Me'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value} accessibilityState={{ selected: value === tab }} onPress={() => { setTab(value); setError(''); setNotice(''); setCancel(''); setSignOut(false); }} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' }}><Copy kind={tab === value ? 'body' : 'small'}>{value}</Copy></Pressable>)}</View></View>;
}
