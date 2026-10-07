/** S3 step 1: consult type — three rows of large text. */
import type { ConsultType } from '@drprop/brand/pricing';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FlowHeader } from '../../components/flow-header';
import { Body, Display, Mono, Small } from '../../components/type';
import { Row, Screen } from '../../components/ui';
import { useApp } from '../../state/app-state';
import { FONT, SPACE } from '../../theme';

const TYPES: ConsultType[] = ['clinic', 'urgent', 'review'];

export default function ChooseType() {
  const { t, consultations, setDraft, draft } = useApp();
  // The latest finished consult (not itself a review): a review follows it.
  const diagnosis = consultations
    .filter((c) => c.status === 'done' && c.type !== 'review')
    .sort((a, b) => (b.scheduledAt ?? b.createdAt).localeCompare(a.scheduledAt ?? a.createdAt))[0];
  const hasDiagnosis = !!diagnosis;

  const choose = (type: ConsultType) => {
    const base = { band: draft?.band ?? 'lt300k', attachments: [], ...draft, type, followUpOf: undefined };
    if (type === 'review' && diagnosis && !draft?.followUpOf) {
      setDraft({ ...base, band: diagnosis.priceBand, propertyLabel: diagnosis.propertyLabel, followUpOf: diagnosis.id });
    } else {
      setDraft(type === 'review' ? { ...base, followUpOf: draft?.followUpOf } : base);
    }
    router.push('/consult/property');
  };

  return (
    <Screen>
      <FlowHeader step={1} />
      <Display style={s.title}>{t.flow.typeTitle}</Display>
      <View>
        {TYPES.map((type, i) => {
          const copy = t.types[type];
          const blocked = type === 'review' && !hasDiagnosis;
          return (
            <Row key={type} onPress={() => choose(type)} disabled={blocked} accessibilityLabel={`${copy.name}. ${copy.text}`}>
              <View style={s.head}>
                <Mono muted>{String(i + 1).padStart(2, '0')}</Mono>
                <Body style={s.name}>{copy.name}</Body>
              </View>
              <Body muted>{copy.text}</Body>
              <Small>{blocked ? t.flow.reviewNeedsRecord : copy.fee}</Small>
            </Row>
          );
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { marginTop: SPACE[4], marginBottom: SPACE[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE[2] },
  name: { fontFamily: FONT.display, fontSize: 30, lineHeight: 38 },
});
