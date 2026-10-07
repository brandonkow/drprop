/**
 * S3 step 2: property value as a band (§3.2 bands; no exact price asked),
 * an optional short name, optional SPA / brochure / screenshots.
 */
import { bands, consultFee, type PriceBand } from '@drprop/brand/pricing';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { FlowHeader } from '../../components/flow-header';
import { Body, Display, Mono, Small } from '../../components/type';
import { OutlineButton, Row, Screen, SolidButton } from '../../components/ui';
import { rm } from '../../i18n/format';
import { useApp } from '../../state/app-state';
import { FONT, HAIRLINE, INPUT_RESET, SIZE, SPACE, usePalette } from '../../theme';

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

const RANGES: Record<PriceBand, string> = {
  lt300k: '≤ RM 300k',
  '300k-600k': 'RM 300k – 600k',
  '600k-1m': 'RM 600k – 1M',
  '1m-2m': 'RM 1M – 2M',
  gt2m: '> RM 2M',
};

export default function Property() {
  const { t, fmt, draft, setDraft, mode } = useApp();
  const p = usePalette();
  if (!draft) return null;
  // A review keeps the band of the consult it follows.
  const bandLocked = draft.type === 'review' && !!draft.followUpOf;

  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (res.canceled) return;
    // Names only: the preview keeps no file contents. Up to three files of 10 MB.
    const names = res.assets.filter((a) => (a.size ?? 0) <= MAX_BYTES).map((a) => a.name);
    setDraft({ ...draft, attachments: [...draft.attachments, ...names].slice(0, MAX_FILES) });
  };

  return (
    <Screen>
      <FlowHeader step={2} />
      <View style={s.head}>
        <Display>{t.flow.propertyTitle}</Display>
        <Body muted>{t.flow.propertyHint}</Body>
      </View>

      <View accessibilityRole="radiogroup">
        {bands.map((b) => (
          <Row
            key={b.id}
            selected={draft.band === b.id}
            disabled={bandLocked && draft.band !== b.id}
            onPress={() => setDraft({ ...draft, band: b.id })}
          >
            <View style={s.band}>
              <Body style={draft.band === b.id ? undefined : { color: p.muted }}>{RANGES[b.id]}</Body>
              <Mono style={draft.band === b.id ? undefined : { color: p.muted }}>{rm(consultFee(draft.type, b.id))}</Mono>
            </View>
          </Row>
        ))}
      </View>

      <View style={s.extra}>
        <Small>{t.flow.labelTitle}</Small>
        <TextInput
          value={draft.propertyLabel ?? ''}
          onChangeText={(propertyLabel) => setDraft({ ...draft, propertyLabel })}
          placeholder={t.flow.labelPlaceholder}
          placeholderTextColor={p.muted}
          style={[s.input, { color: p.text, borderColor: p.rule }]}
          accessibilityLabel={t.flow.labelTitle}
        />
        {mode === 'connected' ? (
          // Documents are not uploaded yet (no private storage): they come to the consult.
          <Small>{t.flow.attachLater}</Small>
        ) : (
          <>
            <OutlineButton label={t.flow.attach} onPress={attach} disabled={draft.attachments.length >= MAX_FILES} />
            {draft.attachments.length ? <Small>{fmt(t.flow.attached, { n: draft.attachments.length })}</Small> : null}
          </>
        )}
      </View>

      <SolidButton label={t.common.next} onPress={() => router.push('/consult/schedule')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { gap: SPACE[2], marginTop: SPACE[3] },
  band: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  extra: { gap: SPACE[2] },
  input: {
    ...INPUT_RESET,
    fontFamily: FONT.body,
    fontSize: SIZE.body,
    borderBottomWidth: HAIRLINE,
    paddingVertical: SPACE[1] + 4,
  },
});
