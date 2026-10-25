import { router } from 'expo-router';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { useMe, useMyChats } from '@/api/hooks';
import type { ChatPreview } from '@/api/types';
import { Card, MountainCover, Screen, Skeleton, StateView, Text } from '@/components';
import { color, radius, size, space } from '@/theme';
import { formatChatTime } from '@/utils/format';
import { isPast } from '@/utils/trip';

function ChatRow({ chat, myId, past }: { chat: ChatPreview; myId?: string; past: boolean }) {
  const last = chat.last_message;
  const author = last?.sender ? (last.sender.id === myId ? 'Ты' : last.sender.first_name) : null;
  const preview = !last
    ? 'Сообщений пока нет'
    : author
      ? `${author}: ${last.body ?? ''}`
      : (last.body ?? '');
  return (
    <Card
      onPress={() => router.push({ pathname: '/chat/[tripId]', params: { tripId: chat.trip.id } })}
      accessibilityLabel={`${chat.trip.title}. ${preview}${chat.unread_count ? `. Непрочитанных: ${chat.unread_count}` : ''}`}
      style={[styles.row, past && styles.past]}
    >
      <MountainCover cover={chat.trip.direction?.slug} variant="thumb" style={styles.thumb} />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {chat.trip.title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={styles.meta}>
        {last && (
          <Text variant="small" color="muted">
            {formatChatTime(last.created_at)}
          </Text>
        )}
        {chat.unread_count > 0 && (
          <View style={styles.unread}>
            <Text variant="small" color="white">
              {chat.unread_count}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function ChatsScreen() {
  const chats = useMyChats();
  const me = useMe();
  const list = chats.data ?? [];
  const sections = [
    { title: 'Предстоящие выезды', past: false, data: list.filter((c) => !isPast(c.trip)) },
    { title: 'Прошедшие', past: true, data: list.filter((c) => isPast(c.trip)) },
  ].filter((s) => s.data.length > 0);

  const empty = chats.isPending ? (
    <StateView
      status="loading"
      skeleton={[0, 1, 2].map((i) => (
        <Skeleton key={i} height={size.thumb + space.xxl} />
      ))}
    />
  ) : chats.isError ? (
    <StateView status="error" error={chats.error} onRetry={() => void chats.refetch()} />
  ) : (
    <StateView
      status="empty"
      title="Чатов пока нет"
      text="Чат группы появится, когда бронь подтвердят"
      action={{ title: 'Найти выезд', onPress: () => router.navigate('/') }}
    />
  );

  return (
    <Screen padded={false}>
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.trip.id}
        renderItem={({ item, section }) => (
          <ChatRow chat={item} myId={me.data?.id} past={section.past} />
        )}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color="muted" style={styles.section}>
            {section.title}
          </Text>
        )}
        ListHeaderComponent={
          <Text variant="h1" style={styles.title}>
            Чаты
          </Text>
        }
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Separator}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={chats.isRefetching}
            onRefresh={() => void chats.refetch()}
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
  title: { paddingTop: space.xxl, paddingBottom: space.sm },
  section: { marginTop: space.lg, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  past: { backgroundColor: color.track },
  thumb: { width: size.thumb, height: size.thumb, borderRadius: radius.icon },
  text: { flex: 1, gap: space.xxs },
  meta: { alignItems: 'flex-end', gap: space.xs },
  unread: {
    minWidth: size.dot * 3,
    height: size.dot * 3,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  separator: { height: space.sm },
});
