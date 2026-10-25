import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { color, opacity, radius, size, space } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text, type ColorName } from './Text';

type Variant = 'primary' | 'dark' | 'soft';

const VARIANTS: Record<Variant, { bg: string; fg: ColorName }> = {
  primary: { bg: color.accent, fg: 'white' },
  dark: { bg: color.ink, fg: 'white' },
  soft: { bg: color.bg, fg: 'ink' },
};

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color[v.fg]} />
      ) : (
        <Text variant="button" color={v.fg} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'soft' | 'accent';
  iconColor?: ColorName;
  disabled?: boolean;
  /** Точка-индикатор в углу (непрочитанные уведомления). */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ICON_BG = { surface: color.surface, soft: color.bg, accent: color.accent };

/** Круглая кнопка-иконка с областью нажатия 44×44. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  iconColor,
  disabled,
  dot,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={space.xs}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: ICON_BG[variant] },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} color={iconColor ?? (variant === 'accent' ? 'white' : 'ink')} />
      {dot && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: size.button,
    borderRadius: radius.field,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: color.accent2,
    borderWidth: size.border,
    borderColor: color.surface,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
