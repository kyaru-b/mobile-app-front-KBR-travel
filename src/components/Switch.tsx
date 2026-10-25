import { Switch as RNSwitch, StyleSheet, View } from 'react-native';

import { color, radius, space } from '@/theme';

import { Text } from './Text';

type Props = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Строка с переключателем в белой карточке. */
export function Switch({ label, hint, value, onChange }: Props) {
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
      <RNSwitch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: color.border, true: color.accent }}
        thumbColor={color.white}
        ios_backgroundColor={color.border}
      />
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
});
