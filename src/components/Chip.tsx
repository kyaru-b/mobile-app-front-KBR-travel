import { Pressable, StyleSheet } from 'react-native';

import { color, opacity, radius, size, space } from '@/theme';

import { Text } from './Text';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  /** Пунктирная рамка: «+ своё», «+ Добавить пункт». */
  dashed?: boolean;
  accessibilityLabel?: string;
};

/** Фильтр или выбор из набора: активный — тёмный, неактивный — белый с рамкой. */
export function Chip({ label, active = false, onPress, dashed, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.active : styles.inactive,
        dashed && styles.dashed,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="captionStrong" color={active ? 'white' : dashed ? 'accent' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.touch,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: size.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: color.ink, borderColor: color.ink },
  inactive: { backgroundColor: color.surface, borderColor: color.border },
  dashed: { borderStyle: 'dashed' },
  pressed: { opacity: opacity.pressed },
});
