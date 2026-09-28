/**
 * S1 sign-in: phone number + OTP, then one question — what should we call you?
 * No password, no social login, no long form.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Body, Display, Small } from '../components/type';
import { Screen, SolidButton, TextLink } from '../components/ui';
import { requestOtp, verifyOtp } from '../data/mock';
import type { User } from '../data/types';
import { LANGUAGES } from '../i18n/strings';
import { useApp } from '../state/app-state';
import { FONT, HAIRLINE, INPUT_RESET, SIZE, SPACE, usePalette } from '../theme';

type Step = 'phone' | 'code' | 'name';

export default function SignIn() {
  const { t, fmt, language, setLanguage, signIn } = useApp();
  const p = usePalette();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = [s.input, { color: p.text, borderColor: p.text }];

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(phone);
      setStep('code');
    } catch {
      setError(t.signIn.invalidPhone);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      setPending(await verifyOtp(phone, code, language));
      setStep('name');
    } catch {
      setError(t.signIn.invalidCode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={s.langs} accessibilityRole="radiogroup">
        {LANGUAGES.map((l) => (
          <TextLink
            key={l.id}
            label={l.label}
            muted={l.id !== language}
            onPress={() => setLanguage(l.id)}
            style={s.lang}
          />
        ))}
      </View>

      <View style={s.body}>
        {step === 'phone' ? (
          <>
            <Display>{t.signIn.phoneTitle}</Display>
            <Body muted>{t.signIn.phoneHint}</Body>
            <TextInput
              style={input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t.signIn.phonePlaceholder}
              placeholderTextColor={p.muted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel={t.signIn.phoneTitle}
              autoFocus
            />
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <Display>{t.signIn.codeTitle}</Display>
            <Body muted>{fmt(t.signIn.codeHint, { phone })}</Body>
            <TextInput
              style={[...input, s.code]}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={p.muted}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              accessibilityLabel={t.signIn.codeTitle}
              autoFocus
            />
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <Display>{t.signIn.nameTitle}</Display>
            <Body muted>{t.signIn.nameHint}</Body>
            <TextInput
              style={input}
              value={name}
              onChangeText={setName}
              placeholder={t.signIn.namePlaceholder}
              placeholderTextColor={p.muted}
              autoComplete="name"
              textContentType="name"
              accessibilityLabel={t.signIn.nameTitle}
              autoFocus
            />
          </>
        ) : null}

        {error ? <Small accessibilityLiveRegion="polite">{error}</Small> : null}
      </View>

      {step === 'phone' ? <SolidButton label={t.signIn.sendCode} onPress={sendCode} busy={busy} disabled={!phone} /> : null}
      {step === 'code' ? <SolidButton label={t.signIn.verify} onPress={verify} busy={busy} disabled={code.length !== 6} /> : null}
      {step === 'name' ? (
        <SolidButton
          label={t.signIn.start}
          disabled={!name.trim()}
          onPress={() => pending && signIn({ ...pending, displayName: name.trim() })}
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  langs: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACE[2] },
  lang: { minWidth: 36, alignItems: 'center' },
  body: { flex: 1, justifyContent: 'center', gap: SPACE[3] },
  input: {
    ...INPUT_RESET,
    fontFamily: FONT.mono,
    fontSize: SIZE.body + 5,
    borderBottomWidth: HAIRLINE,
    paddingVertical: SPACE[2],
  },
  code: { letterSpacing: 8 },
});
