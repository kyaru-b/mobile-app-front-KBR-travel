import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { errorMessage } from '@/api/errors';
import { color, motion, radius, size, space } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
};

/** Пульсирующая заглушка под будущий контент. */
export function Skeleton({ width = '100%', height, rounded = radius.card, style }: SkeletonProps) {
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: motion.skeletonPulseMs,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.skeletonPulseMs,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: rounded, backgroundColor: color.skeleton, opacity: pulse },
        style,
      ]}
    />
  );
}

type Action = { title: string; onPress: () => void };

type Props =
  | { status: 'loading'; skeleton: ReactNode }
  | { status: 'empty'; title: string; text?: string; action?: Action }
  | { status: 'error'; error: unknown; onRetry: () => void };

/** Общие состояния экрана: скелетон, пусто, ошибка с «Повторить». */
export function StateView(props: Props) {
  if (props.status === 'loading') {
    return (
      <View
        style={styles.skeleton}
        accessible
        accessibilityLabel="Загрузка"
        accessibilityState={{ busy: true }}
      >
        {props.skeleton}
      </View>
    );
  }

  if (props.status === 'empty') {
    return (
      <View style={styles.center}>
        <Icon name="mountain" color="muted" size={size.touch} />
        <Text variant="title" align="center">
          {props.title}
        </Text>
        {props.text && (
          <Text variant="caption" color="muted" align="center">
            {props.text}
          </Text>
        )}
        {props.action && (
          <Button title={props.action.title} onPress={props.action.onPress} style={styles.action} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Icon name="alert" color="danger" size={size.touch} />
      <Text variant="title" align="center">
        Не получилось загрузить
      </Text>
      <Text variant="caption" color="muted" align="center">
        {errorMessage(props.error)}
      </Text>
      <Button title="Повторить" variant="dark" onPress={props.onRetry} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: space.md },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  action: { marginTop: space.md, alignSelf: 'stretch' },
});
