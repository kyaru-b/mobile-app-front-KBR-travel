import { Text as RNText, type TextProps } from 'react-native';

import { color as palette, text, type TextVariant } from '@/theme';

export type ColorName = keyof typeof palette;

type Props = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = 'ink', align, style, ...rest }: Props) {
  return (
    <RNText
      style={[text[variant], { color: palette[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
