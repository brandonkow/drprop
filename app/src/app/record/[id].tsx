/** S4 record detail: diagnosis PDF and its disclaimer, advisor note, questions, attachments, book a review. */
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { Body, Display, Label, Mono, Small } from '../../components/type';
import { OutlineButton, Rule, Screen, TextLink } from '../../components/ui';
import { formatWhen, rm } from '../../i18n/format';
import { useApp } from '../../state/app-state';
import { SPACE } from '../../theme';

export default function Record() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, consultations, language, setDraft } = useApp();
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;

  return (
    <Screen>
      <TextLink label={t.common.back} onPress={() => router.back()} muted />
      <View style={s.head}>
        <Small>
          {t.types[c.type].name} · {t.records.status[c.status]}
        </Small>
        <Display>{c.propertyLabel || t.records.untitled}</Display>
        <Mono muted>{c.scheduledAt ? formatWhen(c.scheduledAt, language) : t.records.urgentWhen}</Mono>
        <Mono muted>{rm(c.fee)}</Mono>
      </View>

      <Section label={t.records.report}>
        {c.reportUrl ? (
          <TextLink label={t.records.report} onPress={() => Linking.openURL(c.reportUrl!)} />
        ) : (
          <Body muted>{c.status === 'done' ? t.records.reportMock : t.records.reportPending}</Body>
        )}
        {/* Brief §2.5: every diagnosis carries this line. */}
        <Small>{t.records.disclaimer}</Small>
      </Section>

      {c.advisorNote ? (
        <Section label={t.records.note}>
          <Body>{c.advisorNote}</Body>
        </Section>
      ) : null}

      {c.questions?.length ? (
        <Section label={t.records.questions}>
          {c.questions.map((q, i) => (
            <View key={q} style={s.question}>
              <Mono muted>{String(i + 1).padStart(2, '0')}</Mono>
              <Body style={s.qText}>{q}</Body>
            </View>
          ))}
        </Section>
      ) : null}

      {c.attachments.length ? (
        <Section label={t.records.attachments}>
          {c.attachments.map((a) => (
            <Body key={a} muted>
              {a}
            </Body>
          ))}
        </Section>
      ) : null}

      {c.status === 'done' ? (
        <OutlineButton
          label={t.records.bookReview}
          onPress={() => {
            setDraft({ type: 'review', band: c.priceBand, propertyLabel: c.propertyLabel, attachments: [] });
            router.push('/consult/schedule');
          }}
        />
      ) : null}
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Rule />
      <Label>{label}</Label>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  head: { gap: SPACE[1], marginTop: SPACE[2], marginBottom: SPACE[2] },
  section: { gap: SPACE[2] },
  question: { flexDirection: 'row', gap: SPACE[2] },
  qText: { flex: 1 },
});
