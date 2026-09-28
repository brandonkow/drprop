import React, { useState } from 'react';
import { router } from 'expo-router';
import { Button, Copy, Field, Message, Screen, Section } from '../components/ui';
import { Pulse } from '../components/Pulse';
import { normalizePhone } from '../domain/booking';
import { useDemo } from '../state/demo';
export default function Onboarding() {
  const { login } = useDemo(); const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('+60'); const [code, setCode] = useState(''); const [name, setName] = useState(''); const [error, setError] = useState('');
  function next() {
    setError('');
    if (step === 0) { if (!normalizePhone(phone)) { setError('Enter a Malaysian number beginning with +60. Use +60 12 345 6789 for this preview.'); return; } setStep(1); }
    else if (step === 1) { if (code !== '246810') { setError('Use the preview code 246810. No SMS is sent.'); return; } setStep(2); }
    else { if (!name.trim() || name.trim().length > 40) { setError('Enter a preferred name of 1–40 characters.'); return; } login(normalizePhone(phone)!, name); router.replace('/(tabs)/home'); }
  }
  return <Screen eyebrow={`WELCOME / 0${step + 1}`} title={['A second opinion, on your side.', 'A quiet welcome.', 'What should we call you?'][step]}><Pulse />
    {step === 0 && <><Copy>Independent property advice begins with a conversation.</Copy><Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={24} /><Copy kind="small">Preview only. No SMS, account creation or live bookings. Use a sample number and do not enter sensitive information.</Copy></>}
    {step === 1 && <><Copy>For {normalizePhone(phone)}.</Copy><Field label="Preview verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} /><Copy kind="small">Enter 246810. This demonstrates the OTP journey; it does not authenticate a phone number.</Copy></>}
    {step === 2 && <><Copy>A name you feel at home with.</Copy><Field label="Preferred name" value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" /></>}
    {error && <Message>{error}</Message>}<Section><Button solid title={step === 0 ? 'Continue with phone' : step === 1 ? 'Verify preview code' : 'Enter the lounge'} onPress={next} />{step > 0 && <Button title="Back" onPress={() => { setError(''); setStep(step - 1); }} />}</Section>
  </Screen>;
}
