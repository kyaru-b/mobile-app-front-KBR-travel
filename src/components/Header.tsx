import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { IconButton } from './Button';
import type { IconName } from './Icon';

type Props = {
  /** Иконка слева: «назад» или «закрыть». */
  icon?: Extract<IconName, 'back' | 'close'>;
  onBack?: () => void;
  right?: ReactNode;
};

/** Верхняя строка экранов стека: круглая кнопка назад и правый блок. */
export function Header({ icon = 'back', onBack, right }: Props) {
  return (
    <View style={styles.root}>
      <IconButton
        icon={icon}
        accessibilityLabel={icon === 'close' ? 'Закрыть' : 'Назад'}
        onPress={onBack ?? (() => router.back())}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
  },
});
