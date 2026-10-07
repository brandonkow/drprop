/**
 * S6 me: name, drink preference (the front desk sees it), membership and
 * renewal, language, sign out.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Body, Display, Label, Mono, Small } from '../../components/type';
import { OutlineButton, Rule, Screen, TextLink } from '../../components/ui';
import { source } from '../../data/source';
import { formatDate } from '../../i18n/format';
import { LANGUAGES } from '../../i18n/strings';
import { useApp } from '../../state/app-state';
import { FONT, HAIRLINE, INPUT_RESET, SIZE, SPACE, TOUCH_MIN, usePalette } from '../../theme';

const DRINKS = ['Kopi-O kosong', 'Kopi tarik', 'Teh tarik', 'Milo ais', 'Barley ais'];

export default function Me() {
  const { t, fmt, user, updateUser, membership, setMembership, language, setLanguage, signOut, mode, staff } = useApp();
  const p = usePalette();
  const [renewing, setRenewing] = useState(false);
  if (!user) return null;

  const input = [s.input, { color: p.text, borderColor: p.rule }];

  return (
    <Screen edges={['top']}>
      <Display style={s.title}>{t.me.title}</Display>

      <Field label={t.me.name}>
        <TextInput
          style={input}
          value={user.displayName}
          onChangeText={(displayName) => updateUser({ displayName })}
          accessibilityLabel={t.me.name}
        />
      </Field>

      <Field label={t.me.drink}>
        <TextInput
          style={input}
          value={user.drinkPreference ?? ''}
          onChangeText={(drinkPreference) => updateUser({ drinkPreference })}
          placeholder={t.me.drinkPlaceholder}
          placeholderTextColor={p.muted}
          accessibilityLabel={t.me.drink}
        />
        <View style={s.chips}>
          {DRINKS.map((d) => {
            const on = user.drinkPreference === d;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => updateUser({ drinkPreference: d })}
                style={[s.chip, { borderColor: on ? p.text : p.rule }]}
              >
                <Small muted={!on}>{d}</Small>
              </Pressable>
            );
          })}
        </View>
        <Small>{t.me.drinkHint}</Small>
      </Field>

      {membership ? (
        <Field label={t.me.membership}>
          <View style={s.line}>
            <Body>{t.me.status[membership.status]}</Body>
            <Mono>{membership.memberNo}</Mono>
          </View>
          <Small>{fmt(t.me.renews, { date: formatDate(membership.renewsAt, language) })}</Small>
          <View style={s.actions}>
            {source.canRenew ? (
              <OutlineButton
                label={renewing ? t.me.renewing : t.me.renew}
                busy={renewing}
                onPress={async () => {
                  setRenewing(true);
                  try {
                    setMembership(await source.renew(membership));
                  } finally {
                    setRenewing(false);
                  }
                }}
                style={s.flex}
              />
            ) : null}
            <OutlineButton label={t.home.card} onPress={() => router.push('/card')} style={s.flex} />
          </View>
          {source.canRenew ? null : <Small>{t.me.renewAtDesk}</Small>}
        </Field>
      ) : mode === 'connected' ? (
        <Field label={t.me.membership}>
          <Body muted>{t.me.notMember}</Body>
        </Field>
      ) : null}

      {staff ? (
        <Field label={t.me.staff}>
          <OutlineButton label={t.staff.title} onPress={() => router.push('/staff')} />
        </Field>
      ) : null}

      <Field label={t.me.language}>
        <View style={s.langs} accessibilityRole="radiogroup">
          {LANGUAGES.map((l) => (
            <TextLink key={l.id} label={l.label} muted={l.id !== language} onPress={() => setLanguage(l.id)} style={s.lang} />
          ))}
        </View>
      </Field>

      <Rule />
      <TextLink label={t.me.signOut} onPress={() => void signOut()} muted />
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Rule />
      <Label>{label}</Label>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  title: { marginTop: SPACE[6], marginBottom: SPACE[2] },
  field: { gap: SPACE[2] },
  input: {
    ...INPUT_RESET,
    fontFamily: FONT.body,
    fontSize: SIZE.body,
    borderBottomWidth: HAIRLINE,
    paddingVertical: SPACE[1] + 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[1] },
  chip: { minHeight: TOUCH_MIN, paddingHorizontal: SPACE[2], borderWidth: HAIRLINE, justifyContent: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  actions: { flexDirection: 'row', gap: SPACE[1] },
  flex: { flex: 1 },
  langs: { flexDirection: 'row', gap: SPACE[3] },
  lang: { minWidth: 36, alignItems: 'center' },
});
