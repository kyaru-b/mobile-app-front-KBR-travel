import { Pressable, StyleSheet, View } from 'react-native';

import { size, space } from '@/theme';

import { Icon } from './Icon';

type Props = {
  value: number;
  onChange: (value: number) => void;
};

/** Оценка поездки от 1 до 5 (reviews.rating). */
export function StarRating({ value, onChange }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: 5, now: value }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`Оценка ${n}`}
          style={styles.star}
        >
          <Icon
            name="star"
            color={n <= value ? 'accent2' : 'border'}
            size={size.touch - space.md}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  star: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
});
