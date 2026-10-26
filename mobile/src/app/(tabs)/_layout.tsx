import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { C, F } from '@/lib/theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Feather name={name} size={22} color={focused ? C.ink : C.faint} />;
}

const icon = (name: IconName) => function Icon({ focused }: { focused: boolean }) {
  return <TabIcon name={name} focused={focused} />;
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line, height: 58 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('clock') }} />
      <Tabs.Screen name="studio" options={{ title: 'Studio', tabBarIcon: icon('play-circle') }} />
      <Tabs.Screen name="body" options={{ title: 'Body', tabBarIcon: icon('activity') }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: icon('message-circle') }} />
    </Tabs>
  );
}
