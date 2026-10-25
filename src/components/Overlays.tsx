import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/store/toast';
import { color, motion, radius, size, space } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/** Плашка «Нет соединения» сверху; данные при этом берутся из кэша TanStack Query. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        setOffline(s.isConnected === false);
      }),
    [],
  );

  if (!offline) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.banner, { top: insets.top + size.bannerOffset }]}
      accessibilityLiveRegion="polite"
    >
      <Icon name="wifiOff" color="white" size={size.iconSm} />
      <Text variant="captionStrong" color="white">
        Нет соединения
      </Text>
    </View>
  );
}

/** Короткое сообщение снизу экрана. Вызывается через toast() из store/toast. */
export function Toast() {
  const { message, key, hide } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(hide, motion.toastMs);
    return () => clearTimeout(id);
  }, [message, key, hide]);

  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + size.tabBar + space.lg }]}
      accessibilityLiveRegion="assertive"
    >
      <Text variant="captionStrong" color="white" align="center">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.ink,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  toast: {
    position: 'absolute',
    left: space.screen,
    right: space.screen,
    backgroundColor: color.ink,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.icon,
  },
});
