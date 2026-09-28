import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../state/app-state';
import { SPACE } from '../theme';
import { Small } from './type';
import { TextLink } from './ui';

/** Step counter and the way out of the consult flow. */
export function FlowHeader({ step }: { step: 1 | 2 | 3 }) {
  const { t, fmt } = useApp();
  return (
    <View style={s.row}>
      {step > 1 ? <TextLink label={t.common.back} onPress={() => router.back()} muted /> : <View />}
      <Small>{fmt(t.flow.step, { n: step })}</Small>
      <TextLink label={t.common.cancel} onPress={() => router.dismissTo('/')} muted />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[2] },
});
