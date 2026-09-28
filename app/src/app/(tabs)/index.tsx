/**
 * S2 home: a time-of-day greeting by name, one solid button, the Lounge right
 * now, and the member card. No banners, no feed, no badges.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Display } from '../../components/type';
import { Rule, Screen, SolidButton } from '../../components/ui';
import { STORE } from '../../data/mock';
import { partOfDay } from '../../i18n/strings';
import { useApp } from '../../state/app-state';
import { SPACE, TOUCH_MIN } from '../../theme';

export default function Home() {
  const { t, fmt, user, setDraft } = useApp();
  const greeting = fmt(t.greeting[partOfDay()], { name: user?.displayName ?? '' });

  return (
    <Screen edges={['top']}>
      <View style={s.top}>
        <Display>{greeting}</Display>
      </View>

      <SolidButton
        label={t.home.start}
        onPress={() => {
          setDraft(null);
          router.push('/consult');
        }}
      />

      <View style={s.lounge}>
        <Rule />
        <Body>
          {fmt(t.home.loungeNow, { mood: t.home.moods[STORE.loungeMood], seats: STORE.loungeSeatsFree })}
        </Body>
        <Body muted>{fmt(t.home.coffee, { coffee: STORE.todaysCoffee })}</Body>
        <Rule />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/card')} style={s.cardLink}>
        {({ pressed }) => (
          <View style={[s.cardRow, { opacity: pressed ? 0.6 : 1 }]}>
            <Body>{t.home.card}</Body>
            <Body>→</Body>
          </View>
        )}
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { paddingTop: SPACE[8], paddingBottom: SPACE[4] },
  lounge: { gap: SPACE[2], marginTop: SPACE[5] },
  cardLink: { minHeight: TOUCH_MIN + 8, justifyContent: 'center' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
