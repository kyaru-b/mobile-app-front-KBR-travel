import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useTripsFeed, useUnreadCount, type FeedParams } from '@/api/hooks';
import {
  Chip,
  Icon,
  IconButton,
  Screen,
  Skeleton,
  StateView,
  Text,
  TripCard,
  TripRow,
} from '@/components';
import { color, motion, radius, size, space, text } from '@/theme';
import { useDebounce } from '@/utils/useDebounce';

type Filter = 'all' | 'day' | 'weekend' | 'ski' | 'tour' | 'carpool';

const FILTERS: { value: Filter; label: string; params: FeedParams }[] = [
  { value: 'all', label: 'Все', params: {} },
  { value: 'day', label: 'На 1 день', params: { format: 'day' } },
  { value: 'weekend', label: 'Выходные', params: { format: 'weekend' } },
  { value: 'ski', label: 'Лыжи', params: { tag: 'ski' } },
  { value: 'tour', label: 'Туры', params: { type: 'tour' } },
  { value: 'carpool', label: 'Попутки', params: { type: 'carpool' } },
];

const openTrip = (id: string) => router.push({ pathname: '/trip/[id]', params: { id } });

export default function HomeScreen() {
  const params = useLocalSearchParams<{ direction_id?: string; direction_name?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), motion.searchDebounceMs);

  const feed = useTripsFeed({
    ...FILTERS.find((f) => f.value === filter)?.params,
    q: q || undefined,
    directionId: params.direction_id,
  });
  const unread = useUnreadCount();

  const trips = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const [hero, ...rest] = trips;

  const refresh = () => {
    void feed.refetch();
    void unread.refetch();
  };

  const clearPlace = () => router.setParams({ direction_id: undefined, direction_name: undefined });

  let body;
  if (feed.isPending) {
    body = (
      <StateView
        status="loading"
        skeleton={
          <>
            <Skeleton height={size.coverCard + size.coverTile} rounded={radius.large} />
            <Skeleton height={size.thumb + space.xxl} />
            <Skeleton height={size.thumb + space.xxl} />
          </>
        }
      />
    );
  } else if (feed.isError && trips.length === 0) {
    body = <StateView status="error" error={feed.error} onRetry={refresh} />;
  } else if (!hero) {
    body = (
      <StateView
        status="empty"
        title="На эти даты выездов пока нет"
        text="Соберите свою поездку — попутчики найдутся"
        action={{ title: 'Собрать поездку', onPress: () => router.push('/trip/create') }}
      />
    );
  } else {
    body = (
      <View style={styles.feedTop}>
        <TripCard trip={hero} onPress={() => openTrip(hero.id)} />
        {rest.length > 0 && (
          <View style={styles.sectionHead}>
            <Text variant="title">Ближайшие выезды</Text>
            <Pressable
              onPress={() => router.navigate('/places')}
              accessibilityRole="link"
              hitSlop={space.md}
            >
              <Text variant="captionStrong" color="accent">
                Направления
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={styles.city}>
            <Icon name="pin" color="muted" size={size.iconSm} />
            <Text variant="small" color="muted">
              Выезд из твоего города
            </Text>
          </View>
          <Text variant="h1">в горы вместе</Text>
        </View>
        <IconButton
          icon="bell"
          accessibilityLabel={
            unread.data ? `Уведомления, непрочитанных: ${unread.data}` : 'Уведомления'
          }
          dot={!!unread.data}
          onPress={() => router.push('/notifications')}
        />
      </View>

      <View style={styles.search}>
        <Icon name="search" color="muted" size={size.icon - space.xxs} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Эльбрус, Домбай, озёра..."
          placeholderTextColor={color.muted}
          returnKeyType="search"
          accessibilityLabel="Поиск выездов"
          style={styles.searchInput}
        />
        {search !== '' && (
          <IconButton
            icon="close"
            variant="soft"
            accessibilityLabel="Очистить поиск"
            onPress={() => setSearch('')}
            style={styles.clear}
          />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {params.direction_id && (
          <Chip
            label={`${params.direction_name ?? 'Направление'}  ✕`}
            accessibilityLabel={`Убрать фильтр ${params.direction_name ?? ''}`}
            active
            onPress={clearPlace}
          />
        )}
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            active={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>

      {body}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={hero ? rest : []}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TripRow trip={item} onPress={() => openTrip(item.id)} />}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={color.muted} style={styles.more} />
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={refresh}
            tintColor={color.muted}
          />
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.screen, paddingBottom: space.xxl },
  header: { gap: space.lg, paddingBottom: space.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: space.lg },
  titleBlock: { flex: 1, gap: space.xs },
  city: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.field,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    minHeight: size.button,
  },
  searchInput: { ...text.body, flex: 1, color: color.ink, paddingVertical: space.md },
  clear: { width: size.touch - space.sm, height: size.touch - space.sm },
  chipsScroll: { marginHorizontal: -space.screen },
  chips: { gap: space.sm, paddingHorizontal: space.screen },
  feedTop: { gap: space.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  separator: { height: space.md },
  more: { marginTop: space.lg },
});
