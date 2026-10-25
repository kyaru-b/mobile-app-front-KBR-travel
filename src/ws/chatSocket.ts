import { USE_MOCKS, wsUrl } from '@/api/client';
import { mockStoreMessage } from '@/api/mocks';
import type { Message, UserShort } from '@/api/types';

export type ServerEvent =
  | { type: 'message.ack'; client_id: string; id: number; created_at: string }
  | { type: 'message.new'; message: Message }
  | { type: 'member.joined'; user: UserShort }
  | { type: 'member.left'; user: UserShort }
  | { type: 'pong' };

export type ClientEvent =
  { type: 'message.send'; client_id: string; text: string } | { type: 'ping' };

type Handlers = {
  onEvent: (event: ServerEvent) => void;
  onOpen: (isReconnect: boolean) => void;
  onClose: () => void;
};

const PING_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

/** Транспорт с интерфейсом WebSocket: настоящий или мок. */
type Transport = {
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
};

/**
 * Обёртка над WebSocket чата: переподключение с паузой 1, 2, 4… до 30 с
 * и ping раз в 25 с. После переподключения onOpen(true) — пора догрузить пропущенное.
 */
export class ChatSocket {
  private socket: Transport | null = null;
  private attempt = 0;
  private everOpened = false;
  private open = false;
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly tripId: string,
    private readonly getToken: () => string | null,
    private readonly handlers: Handlers,
  ) {}

  connect(): void {
    this.closedByUser = false;
    const socket = USE_MOCKS
      ? new MockTransport(this.tripId)
      : (new WebSocket(
          wsUrl(`/ws/chat/${this.tripId}`, { token: this.getToken() }),
        ) as unknown as Transport);
    this.socket = socket;

    socket.onopen = () => {
      const isReconnect = this.everOpened;
      this.everOpened = true;
      this.open = true;
      this.attempt = 0;
      this.startPing();
      this.handlers.onOpen(isReconnect);
    };
    socket.onmessage = (e) => {
      try {
        this.handlers.onEvent(JSON.parse(e.data) as ServerEvent);
      } catch {
        // Неизвестный формат — пропускаем.
      }
    };
    socket.onclose = () => {
      this.open = false;
      this.stopPing();
      this.socket = null;
      this.handlers.onClose();
      if (!this.closedByUser) this.scheduleReconnect();
    };
  }

  get isOpen(): boolean {
    return this.open;
  }

  send(event: ClientEvent): boolean {
    if (!this.socket || !this.open) return false;
    this.socket.send(JSON.stringify(event));
    return true;
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopPing();
    this.open = false;
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.attempt, MAX_BACKOFF_MS);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}

/** Мок сервера чата: подтверждает мои сообщения через ~0,6 с. */
class MockTransport implements Transport {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(private readonly tripId: string) {
    setTimeout(() => this.onopen?.(), 300);
  }

  send(data: string): void {
    const event = JSON.parse(data) as ClientEvent;
    if (event.type === 'ping') {
      this.emit({ type: 'pong' });
      return;
    }
    setTimeout(() => {
      const message = mockStoreMessage(this.tripId, event.text);
      this.emit({
        type: 'message.ack',
        client_id: event.client_id,
        id: message.id,
        created_at: message.created_at,
      });
    }, 600);
  }

  close(): void {
    this.onclose = null;
  }

  private emit(event: ServerEvent): void {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}
