import { Children, Fragment, forwardRef, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { color, radius, size, space, text } from '@/theme';

import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  /** Неизменяемый префикс перед вводом, например «+7». */
  prefix?: string;
  /** Без собственного фона — внутри FieldGroup. */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Поле ввода: подпись сверху, значение снизу, ошибка под полем. */
export const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  { label, error, prefix, bare, style, multiline, ...input },
  ref,
) {
  return (
    <View style={style}>
      <View style={[styles.field, !bare && styles.boxed, !!error && !bare && styles.invalid]}>
        <Text variant="small" color="muted">
          {label}
        </Text>
        <View style={styles.row}>
          {prefix && <Text variant="bodyStrong">{prefix}</Text>}
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            placeholderTextColor={color.muted}
            multiline={multiline}
            style={[styles.input, multiline && styles.multiline]}
            {...input}
          />
        </View>
      </View>
      {error && <FieldError message={error} inset={bare} />}
    </View>
  );
});

export function FieldError({ message, inset }: { message: string; inset?: boolean }) {
  return (
    <Text
      variant="small"
      color="danger"
      style={[styles.error, inset && styles.errorInset]}
      accessibilityLiveRegion="polite"
    >
      {message}
    </Text>
  );
}

/** Несколько полей в одной карточке с разделителями: «Откуда / Куда». */
export function FieldGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: size.touch,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.xs,
  },
  boxed: {
    backgroundColor: color.surface,
    borderRadius: radius.field,
    borderWidth: size.border,
    borderColor: color.surface,
  },
  invalid: { borderColor: color.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    ...text.body,
    flex: 1,
    color: color.ink,
    padding: 0,
  },
  multiline: { minHeight: size.touch * 2, textAlignVertical: 'top' },
  error: { marginTop: space.xs, marginLeft: space.xs },
  errorInset: { marginTop: 0, marginLeft: space.lg, marginBottom: space.sm },
  group: { backgroundColor: color.surface, borderRadius: radius.field, overflow: 'hidden' },
  divider: { height: size.hairline, backgroundColor: color.bg, marginHorizontal: space.lg },
});
