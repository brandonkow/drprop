import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button, Copy, Field, Message, Screen, Section } from '../components/ui';
import { normalizePhone } from '../domain/booking';
import { errorMessage } from './api';
export function SignIn({ client }: { client: SupabaseClient }) {
  const [phone, setPhone] = useState('+60'); const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0); const active = useRef(false);
  useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function submit(verify: boolean) {
    if (active.current) return;
    const normalized = normalizePhone(phone);
    if (!normalized) { setError('Enter a Malaysian number beginning with +60.'); return; }
    if (verify && !/^\d{6}$/.test(code)) { setError('Enter the six-digit code from your SMS.'); return; }
    active.current = true; setBusy(true); setError('');
    try {
      if (verify) {
        const { error: problem } = await client.auth.verifyOtp({ phone: sentTo, token: code, type: 'sms' });
        if (problem) throw problem;
      } else {
        const { error: problem } = await client.auth.signInWithOtp({ phone: normalized });
        if (problem) throw problem; setSentTo(normalized); setCode(''); setSeconds(60);
      }
    } catch (issue) { setError(errorMessage(issue)); }
    finally { active.current = false; setBusy(false); }
  }
  return <Screen eyebrow="WELCOME" title={sentTo ? 'Check your messages.' : 'A second opinion, on your side.'}>
    {sentTo ? <><Copy>A sign-in code was requested for {sentTo}.</Copy><Field label="SMS verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} /><Copy kind="small">Use the code sent to your phone. Expired codes can be replaced with a new request.</Copy></> : <><Copy>Sign in to manage your consultations.</Copy><Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={24} /><Copy kind="small">Use a number you can receive messages on. We will send a sign-in code by SMS.</Copy></>}
    {error ? <Message>{error}</Message> : null}<Section>
      <Button solid title={busy ? 'Please wait…' : sentTo ? 'Verify SMS code' : 'Send sign-in code'} disabled={busy} onPress={() => void submit(!!sentTo)} />
      {sentTo ? <><Button title={seconds ? `Request another code in ${seconds}s` : 'Request another code'} disabled={busy || seconds > 0} onPress={() => void submit(false)} /><Button title="Use another number" disabled={busy} onPress={() => { setSentTo(''); setCode(''); setError(''); }} /></> : null}
    </Section>
  </Screen>;
}
