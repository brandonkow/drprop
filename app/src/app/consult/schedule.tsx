/**
 * S3 step 3: time and confirmation on one screen, so opening the app to a
 * finished booking takes four screens (home + three steps).
 * Consult/review: pick a day and a slot. Urgent: an advisor calls within 2 hours.
 * Preview: pay (mock) → success haptic + the pulse line beats once, in place.
 * Supabase: no payment yet, so the client requests the time and the adviser confirms.
 */
import { consultFee } from '@drprop/brand/pricing';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlowHeader } from '../../components/flow-header';
import { PulseBeat } from '../../components/pulse';
import { Body, Display, Mono, Small } from '../../components/type';
import { OutlineButton, Rule, Screen, SolidButton } from '../../components/ui';
import { errorKey } from '../../data/errors';
import { source } from '../../data/source';
import type { Consultation, Slot } from '../../data/types';
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

const sameDay = (iso: string, day: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

export default function Schedule() {
  const { t, fmt, draft, setDraft, user, language, addConsultation, mode } = useApp();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const connected = mode === 'connected';
  const days = useMemo(() => nextDays(8), []);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [fee, setFee] = useState<number | null>(draft ? consultFee(draft.type, draft.band) : null);
  const [urgentOpen, setUrgentOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Consultation | null>(null);
  const [beat, setBeat] = useState(0);
  const urgent = draft?.type === 'urgent';

  // One request ID per set of choices: a retry returns the same booking, a change starts a new one.
  const requestId = useMemo(
    () => randomUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft?.type, draft?.band, draft?.slotId, draft?.scheduledAt, fee],
  );

  const loadSlots = () => {
    if (!draft || urgent) return;
    source
      .slots(draft.type)
      .then((all) => {
        setSlots(all);
        setDay((d) => d ?? days.find((x) => all.some((sl) => sameDay(sl.at, x))) ?? days[1]!);
      })
      .catch((e) => {
        setSlots([]);
        setError(t.errors[errorKey(e)]);
      });
  };

  useEffect(() => {
    if (!draft) return;
    loadSlots();
    source
      .quote(draft.type, draft.band)
      .then(setFee)
      .catch((e) => {
        setFee(null);
        setError(t.errors[errorKey(e)]);
      });
    if (urgent) source.urgentOpen().then(setUrgentOpen, () => setUrgentOpen(false));
    // Load once per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft || !user) return null;
  const daySlots = day && slots ? slots.filter((sl) => sameDay(sl.at, day)) : [];
  const ready = fee !== null && (urgent ? urgentOpen === true : !!draft.slotId);

  const submit = async () => {
    if (fee === null) return;
    setBusy(true);
    setError(null);
    try {
      const c = await source.book(user, draft, fee, requestId);
      addConsultation(c);
      setBooked(c);
      setBeat((b) => b + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      const key = errorKey(e);
      setError(t.errors[key]);
      if (key === 'slotTaken') {
        setDraft({ ...draft, slotId: undefined, scheduledAt: undefined });
        loadSlots();
      }
      if (key === 'feeChanged') source.quote(draft.type, draft.band).then(setFee, () => setFee(null));
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    const chosen = slots?.find((sl) => sl.id === draft.slotId);
    const when = booked.scheduledAt ? formatWhen(booked.scheduledAt, language) : '';
    return (
      <Screen scroll={false}>
        <View style={s.success} accessibilityLiveRegion="polite">
          <PulseBeat beat={beat} width={width - SPACE[3] * 2} tint={p.text} />
          <Display>{connected ? t.flow.requestedTitle : t.flow.successTitle}</Display>
          <Body muted>
            {!booked.scheduledAt
              ? connected
                ? t.flow.requestedUrgent
                : t.flow.successUrgent
              : connected
                ? fmt(t.flow.requestedWhen, { when, adviser: chosen?.adviser ?? '' })
                : fmt(t.flow.successWhen, { when })}
          </Body>
          {connected ? <Small>{t.flow.unpaid}</Small> : null}
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
        <Body muted>{urgentOpen === false ? t.flow.urgentClosed : fmt(t.flow.urgentText, { phone: user.phone })}</Body>
      ) : slots === null ? (
        <Small>{t.flow.findingTimes}</Small>
      ) : connected && slots.length === 0 ? (
        <Small>{t.flow.noOpenTimes}</Small>
      ) : (
        <View style={s.picker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
            {days.map((d) => {
              const on = !!day && d.getTime() === day.getTime();
              return (
                <Pressable
                  key={d.toISOString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setDay(d);
                    setDraft({ ...draft, scheduledAt: undefined, slotId: undefined });
                  }}
                  style={[s.chip, { borderColor: on ? p.text : p.rule }]}
                >
                  <Small muted={!on}>{formatDay(d, language)}</Small>
                </Pressable>
              );
            })}
          </ScrollView>
          {daySlots.length === 0 ? (
            <Small>{day?.getDay() === 1 ? t.flow.closedMonday : t.flow.noSlots}</Small>
          ) : (
            <View style={s.slots}>
              {daySlots.map((slot) => {
                const on = draft.slotId === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={slot.adviser ? `${formatTime(slot.at)}, ${slot.adviser}` : formatTime(slot.at)}
                    onPress={() => setDraft({ ...draft, scheduledAt: slot.at, slotId: slot.id })}
                    style={[s.slot, { borderColor: on ? p.text : p.rule }]}
                  >
                    <Mono muted={!on}>{formatTime(slot.at)}</Mono>
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
          <Mono style={s.fee}>{fee === null ? '—' : rm(fee)}</Mono>
        </View>
        <Small>{t.flow.includes}</Small>
        {connected ? <Small>{t.flow.unpaid}</Small> : null}
      </View>

      {error ? <Small accessibilityLiveRegion="polite">{error}</Small> : null}

      <SolidButton
        label={
          connected
            ? busy
              ? t.flow.requesting
              : urgent
                ? t.flow.requestUrgent
                : t.flow.request
            : busy
              ? t.flow.paying
              : fmt(t.flow.pay, { fee: rm(fee ?? 0) })
        }
        onPress={submit}
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
