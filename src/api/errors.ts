/** Ошибка сервера в едином формате: { error: { code, message, fields } }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Код ошибки → понятный пользователю текст. Единственное место с такими текстами. */
const MESSAGES: Record<string, string> = {
  network: 'Нет соединения с интернетом',
  timeout: 'Сервер долго не отвечает. Попробуйте ещё раз',
  server: 'Что-то пошло не так. Попробуйте ещё раз',
  unauthorized: 'Сессия истекла, войдите снова',
  forbidden: 'Нет доступа к этому чату',
  not_found: 'Не нашли такой выезд',
  validation: 'Проверьте поля формы',
  // Брони и оплата — по исключениям из db/schema.sql
  seats_full: 'Места закончились',
  already_booked: 'У вас уже есть бронь на этот выезд',
  booking_closed: 'Запись на выезд закрыта',
  own_trip: 'Нельзя забронировать свой выезд',
  hold_expired: 'Время на оплату истекло, забронируйте заново',
  not_payable: 'Эта бронь не ждёт оплаты',
  insufficient_funds: 'Недостаточно денег на кошельке',
  cannot_cancel: 'Эту бронь уже нельзя отменить',
  // Билеты
  ticket_not_found: 'Билет не найден',
  ticket_already_scanned: 'Билет уже отсканирован',
  ticket_invalid: 'Билет недействителен: бронь отменена',
  scan_window: 'Сканирование доступно только в день выезда',
  no_scan_access: 'Нет доступа к билетам этого выезда',
  // Выезды
  vehicle_required: 'Для попутки нужна машина',
  vehicle_seats: 'В машине меньше мест, чем в выезде',
  organizer_not_verified: 'Публиковать туры может только проверенный организатор',
  invalid_code: 'Неверный код из SMS',
  code_expired: 'Код устарел, запросите новый',
  too_many_requests: 'Слишком много попыток, подождите немного',
  invalid_phone: 'Проверьте номер телефона',
};

function codeFromStatus(status: number): string {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation';
  if (status === 429) return 'too_many_requests';
  return 'server';
}

export function parseErrorBody(status: number, body: unknown): ApiError {
  const err =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error: { code?: string; message?: string; fields?: Record<string, string> } })
          .error
      : undefined;
  const code = err?.code ?? codeFromStatus(status);
  return new ApiError(status, code, err?.message ?? MESSAGES[code] ?? '', err?.fields ?? {});
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? (error.message || MESSAGES.server!);
  }
  return MESSAGES.server!;
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
