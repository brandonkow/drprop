/**
 * S4 record detail: diagnosis PDF and its disclaimer, advisor note, questions,
 * attachments, book a review, or cancel a booking that hasn't started.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Body, Display, Label, Mono, Small } from '../../components/type';
import { OutlineButton, Rule, Screen, TextLink } from '../../components/ui';
import { errorKey } from '../../data/errors';
import { openSampleReport } from '../../data/sample-report';
import { source } from '../../data/source';
import { formatWhen, rm } from '../../i18n/format';
import { useApp } from '../../state/app-state';
import { useNow } from '../../state/use-now';
import { SPACE } from '../../theme';

export default function Record() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, consultations, language, setDraft, replaceConsultation, mode } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  // Urgent call-backs can be cancelled until the adviser has called; others until they start.
  const cancellable = c.status === 'booked' && (!c.scheduledAt || Date.parse(c.scheduledAt) > now);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      replaceConsultation(await source.cancel(c));
      setConfirming(false);
    } catch (e) {
      setError(t.errors[errorKey(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TextLink label={t.common.back} onPress={() => router.back()} muted />
      <View style={s.head}>
        <Small>
          {t.types[c.type].name} · {c.pending ? t.records.pending : t.records.status[c.status]}
        </Small>
        <Display>{c.propertyLabel || t.records.untitled}</Display>
        <Mono muted>{c.scheduledAt ? formatWhen(c.scheduledAt, language) : t.records.urgentWhen}</Mono>
        <Mono muted>{rm(c.fee)}</Mono>
      </View>

      <Section label={t.records.report}>
        {c.reportUrl ? (
          <TextLink label={t.records.report} onPress={() => Linking.openURL(c.reportUrl!)} />
        ) : mode !== 'connected' && c.id === 'sample' ? (
          // The preview's sample record opens the sample report itself.
          <TextLink label={t.records.openSample} onPress={() => void openSampleReport(language, t.records.openSample)} />
        ) : (
          // Supabase mode has no private file storage yet: the adviser sends the PDF.
          <Body muted>
            {mode === 'connected' ? t.records.reportSent : c.status === 'done' ? t.records.reportMock : t.records.reportPending}
          </Body>
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
            setDraft({ type: 'review', band: c.priceBand, propertyLabel: c.propertyLabel, attachments: [], followUpOf: c.id });
            router.push('/consult/schedule');
          }}
        />
      ) : null}

      {cancellable ? (
        <View style={s.section}>
          <Rule />
          {confirming ? (
            <>
              <Body>{t.records.cancelConfirm}</Body>
              <OutlineButton label={busy ? t.records.cancelling : t.records.cancelYes} busy={busy} onPress={cancel} />
              <TextLink label={t.records.keep} onPress={() => setConfirming(false)} muted />
            </>
          ) : (
            <TextLink label={t.records.cancel} onPress={() => setConfirming(true)} muted />
          )}
          {error ? <Small accessibilityLiveRegion="polite">{error}</Small> : null}
        </View>
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
