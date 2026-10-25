import { StyleSheet, View } from 'react-native';

import { color, radius, size, space } from '@/theme';

import { IconButton } from './Button';
import { Text } from './Text';

type Props = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** Счётчик «− 3 +» в белой карточке. */
export function Stepper({ label, hint, value, min, max, onChange }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {hint && (
          <Text variant="small" color="muted">
            {hint}
          </Text>
        )}
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="minus"
          variant="soft"
          accessibilityLabel="Меньше"
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.button}
        />
        <Text
          variant="title"
          style={styles.value}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${label}: ${value}`}
        >
          {value}
        </Text>
        <IconButton
          icon="plus"
          variant="soft"
          accessibilityLabel="Больше"
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.field,
    padding: space.lg,
    gap: space.md,
  },
  text: { flex: 1, gap: space.xxs },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  button: { borderRadius: radius.icon },
  value: { minWidth: size.touch / 2, textAlign: 'center' },
});
