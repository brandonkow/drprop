/**
 * S3 step 3: time and confirmation on one screen, so opening the app to a
 * finished booking takes four screens (home + three steps).
 * Consult/review: pick a day and a slot. Urgent: an advisor calls within 2 hours.
 * Pay (mock) → success haptic + the pulse line beats once, in place.
 */
import { consultFee } from '@drprop/brand/pricing';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlowHeader } from '../../components/flow-header';
import { PulseBeat } from '../../components/pulse';
import { Body, Display, Mono, Small } from '../../components/type';
import { OutlineButton, Rule, Screen, SolidButton } from '../../components/ui';
import { book, slotsFor } from '../../data/mock';
import type { Consultation } from '../../data/types';
import { formatDay, formatTime, formatWhen, rm } from '../../i18n/format';
import { useApp } from '../../state/app-state';
import { FONT, HAIRLINE, SPACE, TOUCH_MIN, usePalette } from '../../theme';

function nextDays(n: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function Schedule() {
  const { t, fmt, draft, setDraft, user, language, addConsultation } = useApp();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const days = useMemo(() => nextDays(8), []);
  const [day, setDay] = useState(() => days.find((d) => slotsFor(d).length) ?? days[1]!);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState<Consultation | null>(null);
  const [beat, setBeat] = useState(0);

  if (!draft || !user) return null;
  const urgent = draft.type === 'urgent';
  const slots = slotsFor(day);
  const fee = consultFee(draft.type, draft.band);
  const ready = urgent || !!draft.scheduledAt;

  const pay = async () => {
    setBusy(true);
    try {
      const c = await book(user, draft);
      addConsultation(c);
      setBooked(c);
      setBeat((b) => b + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <Screen scroll={false}>
        <View style={s.success} accessibilityLiveRegion="polite">
          <PulseBeat beat={beat} width={width - SPACE[3] * 2} tint={p.text} />
          <Display>{t.flow.successTitle}</Display>
          <Body muted>
            {booked.scheduledAt
              ? fmt(t.flow.successWhen, { when: formatWhen(booked.scheduledAt, language) })
              : t.flow.successUrgent}
          </Body>
        </View>
        <OutlineButton
          label={t.flow.home}
          onPress={() => {
            setDraft(null);
            router.dismissTo('/');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlowHeader step={3} />
      <Display style={s.title}>{urgent ? t.flow.urgentTitle : t.flow.scheduleTitle}</Display>

      {urgent ? (
        <Body muted>{fmt(t.flow.urgentText, { phone: user.phone })}</Body>
      ) : (
        <View style={s.picker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
            {days.map((d) => {
              const on = d.getTime() === day.getTime();
              return (
                <Pressable
                  key={d.toISOString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setDay(d);
                    setDraft({ ...draft, scheduledAt: undefined });
                  }}
                  style={[s.chip, { borderColor: on ? p.text : p.rule }]}
                >
                  <Small muted={!on}>{formatDay(d, language)}</Small>
                </Pressable>
              );
            })}
          </ScrollView>
          {day.getDay() === 1 ? (
            <Small>{t.flow.closedMonday}</Small>
          ) : slots.length === 0 ? (
            <Small>{t.flow.noSlots}</Small>
          ) : (
            <View style={s.slots}>
              {slots.map((slot) => {
                const on = draft.scheduledAt === slot.toISOString();
                return (
                  <Pressable
                    key={slot.toISOString()}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setDraft({ ...draft, scheduledAt: slot.toISOString() })}
                    style={[s.slot, { borderColor: on ? p.text : p.rule }]}
                  >
                    <Mono muted={!on}>{formatTime(slot)}</Mono>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={s.summary}>
        <Rule />
        <Small>{t.flow.summary}</Small>
        <Body>
          {t.types[draft.type].name}
          {draft.propertyLabel ? ` · ${draft.propertyLabel}` : ''}
        </Body>
        {draft.scheduledAt ? <Body muted>{formatWhen(draft.scheduledAt, language)}</Body> : null}
        <View style={s.feeRow}>
          <Body muted>{t.flow.fee}</Body>
          <Mono style={s.fee}>{rm(fee)}</Mono>
        </View>
        <Small>{t.flow.includes}</Small>
      </View>

      <SolidButton
        label={busy ? t.flow.paying : fmt(t.flow.pay, { fee: rm(fee) })}
        onPress={pay}
        busy={busy}
        disabled={!ready}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { marginTop: SPACE[3] },
  picker: { gap: SPACE[2] },
  days: { gap: SPACE[1] },
  chip: { minHeight: TOUCH_MIN, paddingHorizontal: SPACE[2], borderWidth: HAIRLINE, justifyContent: 'center' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[1] },
  slot: { minHeight: TOUCH_MIN, minWidth: 76, borderWidth: HAIRLINE, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: SPACE[1], marginTop: SPACE[2] },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fee: { fontFamily: FONT.mono, fontSize: 28 },
  success: { flex: 1, justifyContent: 'center', gap: SPACE[3] },
});
