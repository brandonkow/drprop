import { Stack } from 'expo-router';
import { usePalette } from '../../theme';

/** S3 consult flow: three steps, one screen each (type → property → time + pay). */
export default function ConsultLayout() {
  const p = usePalette();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'slide_from_right' }} />
  );
}
