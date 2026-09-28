/** S4 records: newest first; date, property, type, status. */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Body, Display, Mono, Small } from '../../components/type';
import { Row, Screen } from '../../components/ui';
import { formatDate } from '../../i18n/format';
import { useApp } from '../../state/app-state';
import { SPACE } from '../../theme';

export default function Records() {
  const { t, consultations, language } = useApp();
  const sorted = [...consultations].sort((a, b) =>
    (b.scheduledAt ?? b.createdAt).localeCompare(a.scheduledAt ?? a.createdAt),
  );

  return (
    <Screen edges={['top']}>
      <Display style={s.title}>{t.records.title}</Display>
      {sorted.length === 0 ? (
        <View style={s.empty}>
          <Body muted>{t.records.empty}</Body>
        </View>
      ) : (
        <View>
          {sorted.map((c) => (
            <Row key={c.id} onPress={() => router.push(`/record/${c.id}`)}>
              <View style={s.line}>
                <Mono muted style={s.date}>
                  {formatDate(c.scheduledAt ?? c.createdAt, language)}
                </Mono>
                <Small>{t.records.status[c.status]}</Small>
              </View>
              <Body>{c.propertyLabel || t.records.untitled}</Body>
              <Small>{t.types[c.type].name}</Small>
            </Row>
          ))}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { marginTop: SPACE[6], marginBottom: SPACE[2] },
  empty: { flex: 1, justifyContent: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  date: { fontSize: 14 },
});
