import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { Button, Copy, Message, Screen, ThemeOverride, useReducedMotion } from '../components/ui';
import { Pulse } from '../components/Pulse';
import CardSurface from '../components/CardSurface';
import { useDemo } from '../state/demo';
export default function Membership() {
  const { state } = useDemo(); const reduced = useReducedMotion(); const { width: viewport } = useWindowDimensions();
  const width = Math.min(360, viewport - 48), height = width * 1.45;
  const [tilt, setTilt] = useState(0); const [enabled, setEnabled] = useState(false); const [notice, setNotice] = useState('');
  const [active, setActive] = useState(AppState.currentState === 'active'); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const sub = AppState.addEventListener('change', status => setActive(status === 'active')); return () => { mounted.current = false; sub.remove(); }; }, []);
  async function enableMotion() {
    if (reduced) { setNotice('Your reduced-motion preference keeps the card still.'); return; }
    try {
      const permission = await Gyroscope.requestPermissionsAsync();
      if (!permission.granted) { if (mounted.current) setNotice('Motion permission was not granted. Your card remains available.'); return; }
      const available = await Gyroscope.isAvailableAsync();
      if (!mounted.current) return;
      if (!available) { setNotice('This device does not provide motion data. Your card remains still.'); return; }
      setEnabled(true); setNotice('Tilt gently to change the sheen.');
    } catch { if (mounted.current) setNotice('Motion is unavailable. Your card remains still.'); }
  }
  useEffect(() => {
    if (!enabled || reduced || !active) { setTilt(0); return; }
    Gyroscope.setUpdateInterval(50);
    const sub = Gyroscope.addListener(({ y }) => setTilt(value => Math.max(-1, Math.min(1, value * 0.96 + y * 0.05))));
    return () => sub.remove();
  }, [enabled, reduced, active]);
  const member = state.membership;
  return <ThemeOverride.Provider value="dark"><StatusBar style="light" /><Screen eyebrow="YOUR LOUNGE MEMBERSHIP" title="A place for you."><View style={{ width, height, alignSelf: 'center', backgroundColor: '#141412', borderRadius: 2, overflow: 'hidden' }}><CardSurface width={width} height={height} tilt={tilt} /><View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}><Text style={{ fontFamily: 'Geist', color: '#EDE9E1', fontSize: 16, letterSpacing: 3 }}>DR. PROP</Text><Pulse light /><View style={{ gap: 14 }}><Text style={{ fontFamily: 'InstrumentSerif', fontSize: 32, color: '#EDE9E1' }}>{state.user?.displayName}</Text><Text style={{ fontFamily: 'GeistMono', fontSize: 14, letterSpacing: 2, color: '#EDE9E1' }}>{member?.memberNo}</Text><Text style={{ fontFamily: 'Geist', fontSize: 12, color: '#BAB4A9' }}>PREVIEW / NOT A VALID MEMBERSHIP</Text></View></View></View>
    <Copy kind="small">{member?.status === 'active' ? 'Active demo membership' : member?.status === 'waitlist' ? 'Demo waiting list' : 'Demo membership expired'}. {member?.renewsAt ? `Renews ${new Date(member.renewsAt).toLocaleDateString('en-MY')}.` : ''}</Copy>
    {member?.status === 'active' && <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#FBFAF7', gap: 16 }}><QRCode value={`DRPROP-DEMO-NOT-VALID:${member.memberNo}`} size={152} color="#1C1B19" backgroundColor="#FBFAF7" /><Text style={{ fontFamily: 'Geist', color: '#1C1B19', fontSize: 13 }}>Demo check-in QR · no access granted</Text></View>}
    <Button title={enabled ? 'Turn motion off' : 'Enable card motion'} onPress={() => enabled ? setEnabled(false) : void enableMotion()} />{notice && <Message>{notice}</Message>}<Button title="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
  </Screen></ThemeOverride.Provider>;
}
