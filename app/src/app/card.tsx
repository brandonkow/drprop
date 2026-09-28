/**
 * S5 member card, full screen on night: the most carefully made screen in the
 * app (brief §8.3). Card with tilt sheen, and the check-in QR below it.
 */
import { color } from '@drprop/brand/tokens';
import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberCard } from '../components/member-card';
import { QrCode } from '../components/qr';
import { TextLink } from '../components/ui';
import { useApp } from '../state/app-state';
import { FONT, SIZE, SPACE } from '../theme';

export default function Card() {
  const { t, user, membership } = useApp();
  const { width, height } = useWindowDimensions();
  if (!user || !membership) return null;

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
        <QrCode value={`drprop:checkin:${membership.memberNo}`} size={qr} label={t.card.checkIn} />
        <Text style={s.hint}>{t.card.checkIn}</Text>
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
  hint: { fontFamily: FONT.body, fontSize: SIZE.small, color: color.nightText, opacity: 0.7 },
});
