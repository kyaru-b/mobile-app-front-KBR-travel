import { router, useLocalSearchParams } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { errorMessage, isApiError } from '@/api/errors';
import { useTrip } from '@/api/hooks';
import {
  Avatar,
  AvatarStack,
  Footer,
  IconButton,
  Screen,
  Skeleton,
  StateView,
  Text,
} from '@/components';
import { toast } from '@/store/toast';
import { color, radius, size, space, text } from '@/theme';
import { formatDayLong, pluralize } from '@/utils/format';
import { useChat, type ChatItem } from '@/ws/useChat';

type BubbleProps = {
  message: ChatItem;
  mine: boolean;
  onRetry: (clientId: string) => void;
};

const Bubble = memo(function Bubble({ message, mine, onRetry }: BubbleProps) {
  if (message.type === 'system' || !message.sender) {
    return (
      <Text variant="small" color="muted" align="center" style={styles.system}>
        {message.body}
      </Text>
    );
  }
  return (
    <View style={[styles.messageRow, mine && styles.mineRow]}>
      {!mine && <Avatar user={message.sender} size={size.avatarSm} />}
      <View style={[styles.messageCol, mine && styles.mineCol]}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text variant="body" color={mine ? 'white' : 'ink'}>
            {message.body}
          </Text>
        </View>
        {message.status === 'sending' && (
          <Text variant="small" color="muted">
            отправляется…
          </Text>
        )}
        {message.status === 'failed' && (
          <Pressable
            onPress={() => onRetry(message.client_id!)}
            accessibilityRole="button"
            hitSlop={space.md}
          >
            <Text variant="small" color="danger">
              не отправлено, повторить
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

function ChatSkeleton() {
  return (
    <StateView
      status="loading"
      skeleton={[0, 1, 2].map((i) => (
        <Skeleton
          key={i}
          height={size.touch}
          width={i % 2 ? '55%' : '70%'}
          style={i % 2 ? styles.mineRow : undefined}
        />
      ))}
    />
  );
}

export default function ChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useTrip(tripId);
  const { history, items, myId, send, retry } = useChat(tripId);
  const [draft, setDraft] = useState('');
  const forbidden = isApiError(history.error, 'forbidden');

  useEffect(() => {
    if (!forbidden) return;
    toast(errorMessage(history.error));
    router.back();
  }, [forbidden, history.error]);

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    send(value);
    setDraft('');
  };

  const t = trip.data;

  let body;
  if (history.isPending) {
    body = <ChatSkeleton />;
  } else if (history.isError && items.length === 0) {
    body = forbidden ? null : (
      <StateView status="error" error={history.error} onRetry={() => void history.refetch()} />
    );
  } else {
    body = (
      <FlatList
        inverted
        data={items}
        keyExtractor={(m) => m.client_id ?? String(m.id)}
        renderItem={({ item }) => (
          <Bubble
            message={item}
            mine={item.status !== undefined || item.sender?.id === myId}
            onRetry={retry}
          />
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        ListFooterComponent={
          history.isFetchingNextPage ? <ActivityIndicator color={color.muted} /> : undefined
        }
        ListEmptyComponent={
          <View style={styles.flip}>
            <StateView status="empty" title="Сообщений пока нет" text="Напишите группе первым" />
          </View>
        }
      />
    );
  }

  return (
    <Screen
      padded={false}
      keyboard
      footer={
        <Footer style={styles.inputBar}>
          <IconButton
            icon="plus"
            variant="soft"
            accessibilityLabel="Опрос или общие расходы"
            onPress={() => toast('Опросы и общие расходы появятся скоро')}
          />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Сообщение"
            placeholderTextColor={color.muted}
            multiline
            accessibilityLabel="Сообщение"
            style={styles.input}
          />
          <IconButton
            icon="send"
            variant="accent"
            accessibilityLabel="Отправить"
            disabled={!draft.trim()}
            onPress={submit}
          />
        </Footer>
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          variant="soft"
          accessibilityLabel="Назад"
          onPress={() => router.back()}
        />
        <Pressable
          style={styles.headerText}
          onPress={() => router.push({ pathname: '/trip/[id]', params: { id: tripId } })}
          accessibilityRole="button"
          accessibilityLabel="Открыть карточку выезда"
        >
          <Text variant="bodyStrong" numberOfLines={1}>
            {t?.title ?? ' '}
          </Text>
          <Text variant="small" color="muted" numberOfLines={1}>
            {t
              ? `${pluralize(t.participants_count, ['участник', 'участника', 'участников'])} · ${formatDayLong(t.departure_at)}`
              : ' '}
          </Text>
        </Pressable>
        {t && <AvatarStack users={t.participants_preview} />}
      </View>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  headerText: { flex: 1 },
  body: { flex: 1 },
  list: { padding: space.lg, gap: space.md },
  flip: { transform: [{ scaleY: -1 }] },
  system: { alignSelf: 'center', paddingHorizontal: space.xl },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  mineRow: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageCol: { maxWidth: size.bubbleMaxWidth, gap: space.xs },
  mineCol: { alignItems: 'flex-end' },
  bubble: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm + space.xxs,
    borderRadius: radius.field,
  },
  theirs: { backgroundColor: color.surface, borderBottomLeftRadius: space.xs },
  mine: { backgroundColor: color.accent, borderBottomRightRadius: space.xs },
  inputBar: { alignItems: 'flex-end', backgroundColor: color.surface },
  input: {
    ...text.body,
    flex: 1,
    color: color.ink,
    backgroundColor: color.bg,
    borderRadius: radius.field,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    minHeight: size.touch,
    maxHeight: size.touch * 3,
  },
});
