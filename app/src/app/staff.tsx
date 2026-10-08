/**
 * Adviser schedule (supabase mode, active advisers only; reached from Me).
 * Check members in to the Lounge (a desk QR scanner types into the code field),
 * take urgent call-backs, confirm and finish consults, write the note and
 * questions the client sees in Records, open 30-minute times, and set the Lounge
 * board on the home screen. Times are Malaysia time. The database checks the role.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Body, Display, Label, Mono, Small } from '../components/type';
import { OutlineButton, Rule, Screen, SolidButton, TextLink } from '../components/ui';
import { malaysiaClock, malaysiaDay, malaysiaInstant, nextMalaysiaDays } from '../backend/malaysia-time';
import { errorKey } from '../data/errors';
import { staffApi, type CheckedIn, type StaffBooking, type StaffSlot } from '../data/supabase';
import type { Lounge } from '../data/types';
import { formatDay } from '../i18n/format';
import { useApp } from '../state/app-state';
import { useNow } from '../state/use-now';
import { FONT, HAIRLINE, INPUT_RESET, SIZE, SPACE, TOUCH_MIN, usePalette } from '../theme';

/** 10:00 to 19:30, every 30 minutes (brief §11: hours to be confirmed). */
const TIMES = Array.from({ length: 20 }, (_, i) => {
  const m = 10 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}`;
});

export default function Staff() {
  const { t, fmt, user, language, lounge, refresh } = useApp();
  const p = usePalette();
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [slots, setSlots] = useState<StaffSlot[]>([]);
  const [day, setDay] = useState(() => nextMalaysiaDays(1)[0]!);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [board, setBoard] = useState<Lounge>(lounge ?? { seatsFree: 0, mood: 'quiet', coffee: '' });
  const [code, setCode] = useState('');
  const [checkedIn, setCheckedIn] = useState<CheckedIn | null>(null);
  const now = useNow();

  const fetchAll = useCallback(
    () => (user ? Promise.all([staffApi.bookings(), staffApi.slots(user.id)]) : Promise.resolve(null)),
    [user],
  );
  const load = useCallback(async () => {
    const all = await fetchAll();
    if (all) {
      setBookings(all[0]);
      setSlots(all[1]);
    }
  }, [fetchAll]);

  useEffect(() => {
    let live = true;
    fetchAll()
      .then((all) => {
        if (live && all) {
          setBookings(all[0]);
          setSlots(all[1]);
        }
      })
      .catch((e) => live && setMessage(t.errors[errorKey(e)]));
    return () => {
      live = false;
    };
  }, [fetchAll, t]);

  /** One change at a time; reload afterwards so the screen shows what the server holds. */
  const act = async (work: () => Promise<unknown>, done?: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await work();
      await load();
      if (done) setMessage(done);
    } catch (e) {
      setMessage(t.errors[errorKey(e)]);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  const checkIn = () => {
    const scanned = code.trim();
    if (!scanned || busy) return;
    // Clear the field either way: a desk scanner types the next code into it.
    setCode('');
    setCheckedIn(null);
    void act(async () => setCheckedIn(await staffApi.checkIn(scanned)));
  };
  const callbacks = bookings.filter((b) => b.booking.adviser_id === null);
  const mine = bookings.filter((b) => b.booking.adviser_id !== null);
  const days = nextMalaysiaDays(14);
  const at = (iso: string) => `${formatDay(iso, language)} · ${malaysiaClock(iso)}`;

  return (
    <Screen>
      <TextLink label={t.common.back} onPress={() => router.back()} muted />
      <Display style={s.title}>{t.staff.title}</Display>
      {message ? <Small accessibilityLiveRegion="polite">{message}</Small> : null}

      <Section label={t.staff.checkIn}>
        <Small>{t.staff.checkInHint}</Small>
        <TextInput
          value={code}
          onChangeText={setCode}
          onSubmitEditing={checkIn}
          inputMode="numeric"
          maxLength={40}
          autoCorrect={false}
          placeholder="000 000"
          placeholderTextColor={p.muted}
          style={[s.input, { color: p.text, borderColor: p.rule }]}
          accessibilityLabel={t.staff.checkInCode}
        />
        <OutlineButton label={t.staff.checkInButton} busy={busy} onPress={checkIn} />
        {checkedIn ? (
          <View accessibilityLiveRegion="polite">
            <Body>{fmt(t.staff.checkedIn, { name: checkedIn.name, no: checkedIn.memberNo })}</Body>
            {checkedIn.drink ? <Small>{fmt(t.staff.drink, { drink: checkedIn.drink })}</Small> : null}
          </View>
        ) : null}
      </Section>

      {callbacks.length ? (
        <Section label={t.staff.callbacks}>
          {callbacks.map(({ booking: b, customerName, customerPhone, customerDrink }) => (
            <View key={b.id} style={s.item}>
              <Body>{b.property_label}</Body>
              <Small>
                {customerName} · +{customerPhone.replace(/^\+/, '')}
                {customerDrink ? ` · ${fmt(t.staff.drink, { drink: customerDrink })}` : ''}
              </Small>
              <Mono muted>{fmt(t.staff.callBy, { time: malaysiaClock(b.ends_at) })}</Mono>
              <OutlineButton label={t.staff.take} busy={busy} onPress={() => act(() => staffApi.takeUrgent(b.id))} />
            </View>
          ))}
        </Section>
      ) : null}

      <Section label={t.staff.consults}>
        {mine.length === 0 ? <Body muted>{t.staff.none}</Body> : null}
        {mine.map((item) => (
          <Consult key={item.booking.id} item={item} busy={busy} act={act} at={at} />
        ))}
      </Section>

      <Section label={t.staff.open}>
        <Small>{t.staff.openHint}</Small>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {days.map((d) => (
            <Chip
              key={d}
              on={d === day}
              onPress={() => {
                setDay(d);
                setTime(null);
              }}
              label={formatDay(`${d}T12:00:00+08:00`, language)}
            />
          ))}
        </ScrollView>
        <View style={s.wrap}>
          {TIMES.map((tm) => {
            const taken = slots.some((sl) => sl.enabled && malaysiaDay(sl.starts_at) === day && malaysiaClock(sl.starts_at) === tm);
            // The server only accepts future times.
            const past = Date.parse(malaysiaInstant(day, tm)) <= now;
            return <Chip key={tm} on={tm === time} disabled={taken || past} onPress={() => setTime(tm)} label={tm} mono />;
          })}
        </View>
        <SolidButton
          label={time ? fmt(t.staff.publish, { time: `${formatDay(`${day}T12:00:00+08:00`, language)} ${time}` }) : t.staff.open}
          disabled={!time}
          busy={busy}
          onPress={() =>
            time &&
            act(async () => {
              await staffApi.publish(malaysiaInstant(day, time));
              setTime(null);
            })
          }
        />
      </Section>

      <Section label={t.staff.published}>
        {slots.length === 0 ? <Body muted>{t.staff.none}</Body> : null}
        {slots.map((sl) => (
          <View key={sl.id} style={s.line}>
            <Mono muted={!sl.enabled}>{at(sl.starts_at)}</Mono>
            {sl.enabled ? (
              <TextLink label={t.staff.close} onPress={() => act(() => staffApi.close(sl.id))} muted disabled={busy} />
            ) : (
              <Small>{t.staff.closed}</Small>
            )}
          </View>
        ))}
      </Section>

      <Section label={t.staff.lounge}>
        <View style={s.line}>
          <Body>{t.staff.seats}</Body>
          <View style={s.row}>
            <Chip label="−" onPress={() => setBoard({ ...board, seatsFree: Math.max(0, board.seatsFree - 1) })} />
            <Mono style={s.count}>{board.seatsFree}</Mono>
            <Chip label="+" onPress={() => setBoard({ ...board, seatsFree: Math.min(99, board.seatsFree + 1) })} />
          </View>
        </View>
        <View style={s.row}>
          {(['quiet', 'lively'] as const).map((m) => (
            <Chip key={m} on={board.mood === m} onPress={() => setBoard({ ...board, mood: m })} label={t.home.moods[m]} />
          ))}
        </View>
        <TextInput
          value={board.coffee}
          onChangeText={(coffee) => setBoard({ ...board, coffee })}
          placeholder={t.staff.coffee}
          placeholderTextColor={p.muted}
          maxLength={60}
          style={[s.input, { color: p.text, borderColor: p.rule }]}
          accessibilityLabel={t.staff.coffee}
        />
        <OutlineButton
          label={t.staff.update}
          busy={busy}
          onPress={() =>
            act(async () => {
              await staffApi.setLounge(board);
              await refresh();
            }, t.staff.saved)
          }
        />
      </Section>
    </Screen>
  );
}

function Consult({
  item,
  busy,
  act,
  at,
}: {
  item: StaffBooking;
  busy: boolean;
  act(work: () => Promise<unknown>, done?: string): Promise<void>;
  at(iso: string): string;
}) {
  const { t, fmt } = useApp();
  const p = usePalette();
  const b = item.booking;
  const now = useNow();
  const [note, setNote] = useState(b.advisor_note ?? '');
  const [questions, setQuestions] = useState(b.questions.join('\n'));
  const urgent = b.consultation_type === 'urgent';
  const started = Date.parse(b.starts_at) <= now;
  const ended = urgent || Date.parse(b.ends_at) <= now;
  const input = [s.input, { color: p.text, borderColor: p.rule }];

  return (
    <View style={s.item}>
      <View style={s.line}>
        <Body>{b.property_label}</Body>
        <Small>{t.staff.status[b.status]}</Small>
      </View>
      <Small>
        {t.types[b.consultation_type].name} · {item.customerName} · +{item.customerPhone.replace(/^\+/, '')}
      </Small>
      {item.customerDrink ? <Small>{fmt(t.staff.drink, { drink: item.customerDrink })}</Small> : null}
      <Mono muted>{urgent ? fmt(t.staff.callBy, { time: at(b.ends_at) }) : at(b.starts_at)}</Mono>

      <View style={s.row}>
        {b.status === 'requested' && !started ? (
          <OutlineButton label={t.staff.confirm} busy={busy} onPress={() => act(() => staffApi.status(b.id, 'confirmed'))} />
        ) : null}
        {b.status === 'confirmed' && ended ? (
          <OutlineButton label={t.staff.complete} busy={busy} onPress={() => act(() => staffApi.status(b.id, 'completed'))} />
        ) : null}
        {b.status === 'requested' || b.status === 'confirmed' ? (
          <TextLink label={t.staff.cancel} muted disabled={busy} onPress={() => act(() => staffApi.status(b.id, 'cancelled'))} />
        ) : null}
      </View>

      {b.status === 'confirmed' || b.status === 'completed' ? (
        <View style={s.note}>
          <Label>{t.staff.note}</Label>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={2000} style={input} accessibilityLabel={t.staff.note} />
          <Label>{t.staff.questions}</Label>
          <TextInput
            value={questions}
            onChangeText={setQuestions}
            multiline
            style={input}
            accessibilityLabel={t.staff.questions}
          />
          <OutlineButton
            label={t.staff.saveNote}
            busy={busy}
            onPress={() =>
              act(
                () =>
                  staffApi.note(
                    b.id,
                    note,
                    questions
                      .split('\n')
                      .map((q) => q.trim())
                      .filter(Boolean)
                      .slice(0, 12),
                  ),
                t.staff.saved,
              )
            }
          />
        </View>
      ) : null}
    </View>
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

function Chip({ label, on, disabled, onPress, mono }: { label: string; on?: boolean; disabled?: boolean; onPress(): void; mono?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.chip, { borderColor: on ? p.text : p.rule, opacity: disabled ? 0.35 : 1 }]}
    >
      {mono ? <Mono muted={!on}>{label}</Mono> : <Small muted={!on}>{label}</Small>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  title: { marginTop: SPACE[3], marginBottom: SPACE[2] },
  section: { gap: SPACE[2] },
  item: { gap: SPACE[1], paddingBottom: SPACE[2] },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE[1] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[1] },
  chip: { minHeight: TOUCH_MIN, minWidth: TOUCH_MIN, paddingHorizontal: SPACE[2], borderWidth: HAIRLINE, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 32, textAlign: 'center' },
  note: { gap: SPACE[1], marginTop: SPACE[1] },
  input: {
    ...INPUT_RESET,
    minHeight: TOUCH_MIN,
    fontFamily: FONT.body,
    fontSize: SIZE.body,
    borderBottomWidth: HAIRLINE,
    paddingVertical: SPACE[1],
  },
});
