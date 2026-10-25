import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, opacity, radius, space } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Внутренние отступы; false — для карточек с обложкой во всю ширину. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Белая карточка с радиусом 18. */
export function Card({ children, onPress, accessibilityLabel, padded = true, style }: Props) {
  const base = [styles.card, padded && styles.padded, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: space.lg },
  pressed: { opacity: opacity.pressed },
});
