import { Pressable, StyleSheet, View } from 'react-native';

import { color, radius, shadow, size, space } from '@/theme';

import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Переключатель «Зима · лыжи / Лето · походы», «Мои брони / Прошедшие». */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.root} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.active]}
          >
            <Text variant="captionStrong" color={active ? 'ink' : 'muted'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: color.track,
    borderRadius: radius.icon,
    padding: space.xs,
  },
  item: {
    flex: 1,
    minHeight: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.badge,
  },
  active: { backgroundColor: color.surface, ...shadow.card },
});
