import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, size, space } from '@/theme';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type MenuItem = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** Значение справа: баланс, счётчик. */
  value?: string;
};

/** Белая карточка со строками-ссылками и разделителями. */
export function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <Card padded={false}>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <View style={styles.divider} />}
          <Pressable
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.value ? `${item.label}: ${item.value}` : item.label}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            {item.icon && <Icon name={item.icon} color="muted" size={size.icon - space.xxs} />}
            <Text variant="body" style={styles.grow}>
              {item.label}
            </Text>
            {item.value && <Text variant="bodyStrong">{item.value}</Text>}
            <Icon name="chevron" color="muted" size={size.iconSm + space.xxs} />
          </Pressable>
        </Fragment>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.button,
    paddingHorizontal: space.lg,
  },
  pressed: { backgroundColor: color.bg },
  grow: { flex: 1 },
  divider: { height: size.hairline, backgroundColor: color.bg, marginHorizontal: space.lg },
});
