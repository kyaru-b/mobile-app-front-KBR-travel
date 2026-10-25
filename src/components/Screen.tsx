import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { color, space } from '@/theme';

type Props = {
  children: ReactNode;
  /** Оборачивать ли содержимое в ScrollView. Для FlatList — false. */
  scroll?: boolean;
  /** Горизонтальные поля экрана (space.screen). */
  padded?: boolean;
  edges?: Edge[];
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Закреплённый снизу блок: кнопка «Забронировать», поле ввода. */
  footer?: ReactNode;
  /** Поднимать содержимое и footer над клавиатурой (iOS; на Android — adjustResize). */
  keyboard?: boolean;
};

/** Фон, безопасные отступы сверху и снизу, прокрутка. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  refreshControl,
  contentStyle,
  footer,
  keyboard = false,
}: Props) {
  const padding = padded && styles.padded;
  const body = (
    <>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, padding, contentStyle]}>{children}</View>
      )}
      {footer}
    </>
  );
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

/** Нижняя панель с кнопками поверх контента, учитывает безопасную зону. */
export function Footer({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    backgroundColor: color.bg,
  },
  padded: { paddingHorizontal: space.screen },
  scrollContent: { paddingBottom: space.xxl },
});
