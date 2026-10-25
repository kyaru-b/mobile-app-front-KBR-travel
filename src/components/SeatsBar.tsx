import { StyleSheet, View } from 'react-native';

import { color, radius, size, space } from '@/theme';

const PER_ROW = 4;

type Props = {
  total: number;
  taken: number;
};

/** Шкала мест: занятые — accent, свободные — border. */
export function SeatsBar({ total, taken }: Props) {
  const rows = Array.from({ length: Math.ceil(total / PER_ROW) }, (_, r) =>
    Array.from({ length: PER_ROW }, (_, c) => r * PER_ROW + c),
  );
  return (
    <View style={styles.root} accessible accessibilityLabel={`Занято ${taken} из ${total} мест`}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((i) => (
            <View
              key={i}
              style={[
                styles.seat,
                i >= total ? styles.empty : i < taken ? styles.taken : styles.free,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs + space.xxs },
  row: { flexDirection: 'row', gap: space.xs + space.xxs },
  seat: { flex: 1, height: size.seat, borderRadius: radius.badge / 2 },
  taken: { backgroundColor: color.accent },
  free: { backgroundColor: color.border },
  empty: { backgroundColor: color.transparent },
});
