import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useMarkNotificationsRead, useNotifications } from '@/api/hooks';
import type { Notification } from '@/api/types';
import { Card, Header, Screen, Skeleton, StateView, Text } from '@/components';
import { color, radius, size, space } from '@/theme';
import { formatChatTime } from '@/utils/format';

function NotificationRow({ item }: { item: Notification }) {
  const tripId = item.data?.trip_id;
  return (
    <Card
      onPress={
        tripId ? () => router.push({ pathname: '/trip/[id]', params: { id: tripId } }) : undefined
      }
      accessibilityLabel={`${item.title}. ${item.body ?? ''}`}
      style={styles.card}
    >
      {!item.read_at && <View style={styles.dot} />}
      <View style={styles.grow}>
        <Text variant="bodyStrong">{item.title}</Text>
        {item.body && (
          <Text variant="caption" color="muted">
            {item.body}
          </Text>
        )}
      </View>
      <Text variant="small" color="muted">
        {formatChatTime(item.created_at)}
      </Text>
    </Card>
  );
}

export default function NotificationsScreen() {
  const list = useNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();
  const loaded = list.isSuccess;

  // Открыли экран — считаем уведомления прочитанными, точка на колокольчике гаснет.
  useEffect(() => {
    if (loaded) markRead();
  }, [loaded, markRead]);

  return (
    <Screen padded={false}>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Header />
            <Text variant="h1">Уведомления</Text>
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <StateView
              status="loading"
              skeleton={[0, 1, 2].map((i) => (
                <Skeleton key={i} height={size.thumb + space.xl} />
              ))}
            />
          ) : list.isError ? (
            <StateView status="error" error={list.error} onRetry={() => void list.refetch()} />
          ) : (
            <StateView status="empty" title="Уведомлений пока нет" />
          )
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={color.muted}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.screen, paddingBottom: space.xxl, gap: space.sm },
  header: { gap: space.xs, paddingBottom: space.md },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dot: {
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: color.accent2,
    marginTop: space.sm,
  },
  grow: { flex: 1, gap: space.xxs },
});
