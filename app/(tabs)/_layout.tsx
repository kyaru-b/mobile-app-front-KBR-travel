import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components';
import { color } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="places" options={{ title: 'Места' }} />
      <Tabs.Screen name="chats" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
