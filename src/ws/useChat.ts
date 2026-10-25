import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { keys, useMe, useMessages } from '@/api/hooks';
import type { Message, Page } from '@/api/types';
import { useAuth } from '@/store/auth';

import { ChatSocket, type ServerEvent } from './chatSocket';

export type ChatItem = Message & { status?: 'sending' | 'failed' };

const ACK_TIMEOUT_MS = 10_000;

export function useChat(tripId: string) {
  const qc = useQueryClient();
  const history = useMessages(tripId);
  const meQuery = useMe();
  const myId = meQuery.data?.id ?? null;

  const [pending, setPending] = useState<ChatItem[]>([]);
  const [connected, setConnected] = useState(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const socketRef = useRef<ChatSocket | null>(null);
  const ackTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const prepend = useCallback(
    (message: Message) => {
      qc.setQueryData<InfiniteData<Page<Message>, string | null>>(keys.messages(tripId), (old) => {
        if (!old) return old;
        const [first, ...rest] = old.pages;
        if (!first) return old;
        const items = [message, ...first.items.filter((m) => m.id !== message.id)];
        return { ...old, pages: [{ ...first, items }, ...rest] };
      });
    },
    [qc, tripId],
  );

  const setStatus = useCallback((clientId: string, status: ChatItem['status']) => {
    setPending((list) => list.map((m) => (m.client_id === clientId ? { ...m, status } : m)));
  }, []);

  const dispatch = useCallback(
    (item: ChatItem) => {
      const clientId = item.client_id!;
      const sent = socketRef.current?.send({
        type: 'message.send',
        client_id: clientId,
        text: item.body ?? '',
      });
      if (!sent) {
        setStatus(clientId, 'failed');
        return;
      }
      clearTimeout(ackTimers.current.get(clientId));
      ackTimers.current.set(
        clientId,
        setTimeout(() => setStatus(clientId, 'failed'), ACK_TIMEOUT_MS),
      );
    },
    [setStatus],
  );

  useEffect(() => {
    const timers = ackTimers.current;
    const onEvent = (event: ServerEvent) => {
      switch (event.type) {
        case 'message.ack': {
          clearTimeout(timers.get(event.client_id));
          timers.delete(event.client_id);
          const item = pendingRef.current.find((m) => m.client_id === event.client_id);
          setPending((list) => list.filter((m) => m.client_id !== event.client_id));
          if (item) {
            const { status: _status, ...message } = item;
            prepend({ ...message, id: event.id, created_at: event.created_at });
          }
          break;
        }
        case 'message.new':
          prepend(event.message);
          break;
        case 'member.joined':
        case 'member.left':
          void qc.invalidateQueries({ queryKey: keys.trip(tripId) });
          break;
        default:
          break;
      }
    };

    const socket = new ChatSocket(tripId, () => useAuth.getState().accessToken, {
      onEvent,
      onOpen: (isReconnect) => {
        setConnected(true);
        // Догружаем пропущенное за время обрыва.
        if (isReconnect) void qc.invalidateQueries({ queryKey: keys.messages(tripId) });
      },
      onClose: () => setConnected(false),
    });
    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [qc, tripId, prepend]);

  const send = useCallback(
    (text: string) => {
      const clientId = Crypto.randomUUID();
      const me = meQuery.data;
      const item: ChatItem = {
        id: -Date.now(),
        client_id: clientId,
        type: 'text',
        sender: {
          id: myId ?? 'me',
          first_name: me?.first_name ?? '',
          last_name: me?.last_name ?? null,
        },
        body: text,
        created_at: new Date().toISOString(),
        status: 'sending',
      };
      setPending((list) => [item, ...list]);
      dispatch(item);
    },
    [dispatch, myId, meQuery.data],
  );

  const retry = useCallback(
    (clientId: string) => {
      const item = pendingRef.current.find((m) => m.client_id === clientId);
      if (!item) return;
      setStatus(clientId, 'sending');
      dispatch(item);
    },
    [dispatch, setStatus],
  );

  const items = useMemo<ChatItem[]>(() => {
    const loaded = history.data?.pages.flatMap((p) => p.items) ?? [];
    return [...pending, ...loaded];
  }, [history.data, pending]);

  return { history, items, myId, connected, send, retry };
}
