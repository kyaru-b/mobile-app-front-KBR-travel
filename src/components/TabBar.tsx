import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, radius, shadow, size, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Главная', icon: 'home' },
  places: { label: 'Места', icon: 'mountain' },
  chats: { label: 'Чаты', icon: 'chat' },
  profile: { label: 'Профиль', icon: 'user' },
};

/** Позиция центральной кнопки «+» среди вкладок. */
const FAB_INDEX = 2;

/** Нижняя панель: четыре вкладки и центральная кнопка «Собрать поездку». */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const items = state.routes.map((route, index) => {
    const tab = TABS[route.name];
    if (!tab) return null;
    const focused = index === state.index;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        style={styles.tab}
      >
        <Icon name={tab.icon} color={focused ? 'ink' : 'muted'} />
        <Text variant="tab" color={focused ? 'ink' : 'muted'}>
          {tab.label}
        </Text>
      </Pressable>
    );
  });

  const fab = (
    <View key="fab" style={styles.tab}>
      <Pressable
        onPress={() => router.push('/trip/create')}
        accessibilityRole="button"
        accessibilityLabel="Собрать поездку"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Icon name="plus" color="white" size={size.icon + space.xs} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
  items.splice(FAB_INDEX, 0, fab);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderTopWidth: size.hairline,
    borderTopColor: color.bg,
  },
  tab: {
    flex: 1,
    height: size.tabBar,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
  },
  fab: {
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    backgroundColor: color.accent2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
  fabPressed: { transform: [{ scale: 0.95 }] },
});
