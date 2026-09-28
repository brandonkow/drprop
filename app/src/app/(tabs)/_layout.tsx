/**
 * Three tabs only (brief §8.2): Home · Records · Me. Text labels, no icons,
 * no badges; the active tab is marked by a short line.
 */
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../state/app-state';
import { FONT, HAIRLINE, SIZE, SPACE, TOUCH_MIN, usePalette } from '../../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useApp();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const labels: Record<string, string> = { index: t.tabs.home, records: t.tabs.records, me: t.tabs.me };
  return (
    <View
      accessibilityRole="tablist"
      style={[s.bar, { backgroundColor: p.bg, borderColor: p.rule, paddingBottom: Math.max(insets.bottom, SPACE[1]) }]}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={s.tab}
          >
            <View style={[s.mark, { backgroundColor: focused ? p.text : 'transparent' }]} />
            <Text style={[s.label, { color: focused ? p.text : p.muted }]}>{labels[route.name] ?? route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: HAIRLINE },
  tab: { flex: 1, minHeight: TOUCH_MIN + 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  mark: { width: 16, height: 1.5 },
  label: { fontFamily: FONT.body, fontSize: SIZE.small + 1, letterSpacing: 0.6 },
});
