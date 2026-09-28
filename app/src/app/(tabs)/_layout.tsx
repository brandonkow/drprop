import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ui';
export default function TabLayout() {
  const t = useTheme(); const inset = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false }} tabBar={({ state, descriptors, navigation }) => <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.background, borderTopWidth: 1, borderTopColor: t.rule, paddingBottom: Math.max(inset.bottom, 8), paddingHorizontal: 16 }}>{state.routes.map((route, index) => <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: state.index === index }} onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigation.navigate(route.name); }} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: state.index === index ? t.text : 'transparent' }}><Text style={{ fontFamily: 'Geist', fontSize: 14, color: state.index === index ? t.text : t.muted }}>{descriptors[route.key].options.title ?? route.name}</Text></Pressable>)}</View>}>
    <Tabs.Screen name="home" options={{ title: 'Home' }} /><Tabs.Screen name="records" options={{ title: 'Records' }} /><Tabs.Screen name="me" options={{ title: 'Me' }} />
  </Tabs>;
}
