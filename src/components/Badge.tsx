import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, space } from '@/theme';

import { Text, type ColorName } from './Text';

export type BadgeTone =
  'success' | 'warning' | 'accent2' | 'surface' | 'muted' | 'accent' | 'danger';

const TONES: Record<BadgeTone, { bg: string; fg: ColorName }> = {
  success: { bg: color.successBg, fg: 'success' },
  warning: { bg: color.warningBg, fg: 'warning' },
  accent2: { bg: color.accent2, fg: 'white' },
  surface: { bg: color.surface, fg: 'ink' },
  muted: { bg: color.bg, fg: 'muted' },
  accent: { bg: color.accentSoft, fg: 'accent' },
  danger: { bg: color.dangerBg, fg: 'danger' },
};

type Props = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'surface', style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text variant="small" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.xs + space.xxs,
    borderRadius: radius.badge,
  },
});
