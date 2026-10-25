import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useDirections } from '@/api/hooks';
import type { Direction, Season } from '@/api/types';
import {
  Badge,
  Card,
  MountainCover,
  Screen,
  Segmented,
  Skeleton,
  StateView,
  Text,
} from '@/components';
import { color, size, space } from '@/theme';
import { formatTravelTime, pluralize } from '@/utils/format';

const SEASONS: { value: Season; label: string }[] = [
  { value: 'winter', label: 'Зима · лыжи' },
  { value: 'summer', label: 'Лето · походы' },
];

function DirectionTile({ direction }: { direction: Direction }) {
  const trips =
    direction.trips_count > 0
      ? pluralize(direction.trips_count, ['выезд', 'выезда', 'выездов'])
      : 'пока нет выездов';
  return (
    <Card
      padded={false}
      style={styles.tile}
      accessibilityLabel={`${direction.name}, ${formatTravelTime(direction.travel_minutes)} в пути, ${trips}`}
      onPress={() =>
        router.navigate({
          pathname: '/',
          params: { direction_id: direction.id, direction_name: direction.name },
        })
      }
    >
      <MountainCover cover={direction.slug} variant="tile" style={styles.cover}>
        <View style={styles.badges}>
          <Badge label={formatTravelTime(direction.travel_minutes)} />
          {direction.elevation_m !== null && <Badge label={`${direction.elevation_m} м`} />}
        </View>
      </MountainCover>
      <View style={styles.tileBody}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {direction.name}
        </Text>
        <Text variant="small" color="muted" numberOfLines={2}>
          {direction.description}
        </Text>
        <Text
          variant="captionStrong"
          color={direction.trips_count > 0 ? 'ink' : 'muted'}
          style={styles.count}
        >
          {trips}
        </Text>
      </View>
    </Card>
  );
}

export default function PlacesScreen() {
  const [season, setSeason] = useState<Season>('winter');
  const directions = useDirections({ season });
  const items = directions.data ?? [];
  // Пустая ячейка, чтобы последняя плитка в нечётном списке не растягивалась.
  const cells: (Direction | null)[] = items.length % 2 ? [...items, null] : items;

  const header = (
    <View style={styles.header}>
      <Text variant="h1">Направления</Text>
      <Text variant="caption" color="muted">
        Время в пути — от Нальчика
      </Text>
      <View style={styles.segmented}>
        <Segmented options={SEASONS} value={season} onChange={setSeason} />
      </View>
    </View>
  );

  const empty = directions.isPending ? (
    <StateView
      status="loading"
      skeleton={[0, 1].map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton height={size.coverTile * 2} style={styles.grow} />
          <Skeleton height={size.coverTile * 2} style={styles.grow} />
        </View>
      ))}
    />
  ) : directions.isError ? (
    <StateView status="error" error={directions.error} onRetry={() => void directions.refetch()} />
  ) : (
    <StateView status="empty" title="Направлений пока нет" text="Загляните чуть позже" />
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={cells}
        keyExtractor={(d, i) => d?.id ?? `filler-${i}`}
        numColumns={2}
        renderItem={({ item }) =>
          item ? <DirectionTile direction={item} /> : <View style={styles.grow} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={directions.isRefetching}
            onRefresh={() => void directions.refetch()}
            tintColor={color.muted}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.screen, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.xs, paddingTop: space.xxl, paddingBottom: space.sm },
  segmented: { marginTop: space.lg },
  row: { gap: space.md },
  grow: { flex: 1 },
  tile: { flex: 1 },
  cover: { height: size.coverTile },
  badges: { flexDirection: 'row', gap: space.xs, margin: space.sm },
  tileBody: { padding: space.md, gap: space.xxs, flex: 1 },
  count: { marginTop: space.xs },
});
