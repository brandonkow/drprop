/**
 * S5 member card, full screen on night: the most carefully made screen in the
 * app (brief §8.3). Card with tilt sheen, and the check-in QR below it. The QR
 * holds a six-digit code from the server, new every minute and good for one
 * check-in (supabase/migrations/202610080001_checkin.sql), never the member number.
 */
import { color } from '@drprop/brand/tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberCard } from '../components/member-card';
import { QrCode } from '../components/qr';
import { TextLink } from '../components/ui';
import { source } from '../data/source';
import type { CheckinCode } from '../data/types';
import { useApp } from '../state/app-state';
import { FONT, SIZE, SPACE } from '../theme';

/** Each code is good for two minutes; asking every minute keeps one valid on screen. */
const REFRESH_MS = 60_000;

/** The current check-in code while `on`. A failed refresh keeps the last code until it expires. */
function useCheckinCode(on: boolean): { code: CheckinCode | null; failed: boolean } {
  const [state, setState] = useState<{ code: CheckinCode | null; failed: boolean }>({ code: null, failed: false });
  useEffect(() => {
    if (!on) return;
    let live = true;
    const next = () =>
      source.checkinCode().then(
        (code) => live && setState({ code, failed: false }),
        () => live && setState((s) => ({ code: s.code && Date.parse(s.code.expiresAt) > Date.now() ? s.code : null, failed: true })),
      );
    void next();
    const timer = setInterval(next, REFRESH_MS);
    // Back from the background: the code on screen may have expired.
    const resumed = AppState.addEventListener('change', (state) => state === 'active' && void next());
    return () => {
      live = false;
      clearInterval(timer);
      resumed.remove();
    };
  }, [on]);
  return state;
}

export default function Card() {
  const { t, fmt, user, membership } = useApp();
  const { width, height } = useWindowDimensions();
  // Only an active member checks in to the Lounge.
  const active = membership?.status === 'active';
  const { code, failed } = useCheckinCode(!!user && active);
  if (!user) return null;
  if (!membership) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.top}>
          <Text style={s.title}>{t.card.title}</Text>
          <TextLink label={t.common.close} onPress={() => router.back()} style={s.close} tint={color.nightText} />
        </View>
        <View style={s.center}>
          <Text style={s.hint}>{t.me.notMember}</Text>
        </View>
      </SafeAreaView>
    );
  }
  const cardW = width - SPACE[3] * 2;
  // Portrait card, ID-1 proportions (85.6 × 54 mm), capped to leave room for the QR.
  const cardH = Math.min(cardW * 1.586, height * 0.56);
  const qr = Math.min(132, height * 0.16);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <Text style={s.title}>{t.card.title}</Text>
        <TextLink label={t.common.close} onPress={() => router.back()} style={s.close} tint={color.nightText} />
      </View>

      <View style={s.center}>
        <MemberCard
          width={cardW}
          height={cardH}
          name={user.displayName}
          memberNo={membership.memberNo}
          caption={t.card.since}
        />
      </View>

      <View style={s.checkin}>
        {active ? (
          <>
            {code ? (
              <QrCode value={`drprop:checkin:${code.code}`} size={qr} label={t.card.checkIn} />
            ) : (
              <View style={{ width: qr, height: qr }} />
            )}
            {code ? <Text style={s.code}>{fmt(t.card.code, { code: `${code.code.slice(0, 3)} ${code.code.slice(3)}` })}</Text> : null}
            <Text style={s.hint} accessibilityLiveRegion="polite">
              {failed && !code ? t.card.codeError : `${t.card.checkIn} ${t.card.refresh}`}
            </Text>
          </>
        ) : (
          <Text style={s.hint}>
            {t.me.status[membership.status]} · {t.card.inactive}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.night, paddingHorizontal: SPACE[3] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: FONT.body, fontSize: SIZE.small, letterSpacing: 1.2, textTransform: 'uppercase', color: color.nightText, opacity: 0.7 },
  close: { alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkin: { alignItems: 'center', gap: SPACE[2], paddingBottom: SPACE[3] },
  hint: { fontFamily: FONT.body, fontSize: SIZE.small, color: color.nightText, opacity: 0.7, textAlign: 'center' },
  code: { fontFamily: FONT.mono, fontSize: SIZE.small, letterSpacing: 1.2, color: color.nightText },
});
