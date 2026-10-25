/**
 * Моки API. Включаются EXPO_PUBLIC_USE_MOCKS=true. Повторяют правила из db/schema.sql:
 * удержание мест на 15 минут, оплата через кошелёк в эскроу, билет на каждое место,
 * возврат по free_cancel_hours / late_cancel_refund_percent, окно скана ±12 часов.
 * Состояние живёт в памяти до перезапуска приложения.
 */
import { ApiError } from '../errors';
import type {
  AuthTokens,
  Booking,
  BookingDetails,
  BookingStatus,
  ChatPreview,
  CreateBookingBody,
  CreateTripBody,
  CreateVehicleBody,
  Direction,
  Me,
  Message,
  Page,
  PayMethod,
  ScanResult,
  Ticket,
  Trip,
  TripBooking,
  TripPermissions,
  TripShort,
  UserShort,
  WalletEntry,
} from '../types';
import {
  bookingCode,
  bookings,
  directions,
  lastRead,
  memberships,
  meProfile,
  messages,
  nextMessageId,
  notifications,
  organizers,
  short,
  ticketCode,
  tickets,
  trips,
  userRatings,
  users,
  vehicles,
  wallet,
  type MockBooking,
  type MockTrip,
} from './data';

const LATENCY_MS = 400;
const ME = 'u_me';
const HOLD_MINUTES = 15;
const SCAN_WINDOW_MS = 12 * 3_600_000;
const HOUR = 3_600_000;

type Query = Record<string, string | number | boolean | null | undefined> | undefined;

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

const fail = (status: number, code: string, message = '', fields: Record<string, string> = {}) =>
  new ApiError(status, code, message, fields);

const HOLDS_SEATS: BookingStatus[] = [
  'pending_payment',
  'pending',
  'confirmed',
  'completed',
  'no_show',
];
const ACTIVE: BookingStatus[] = [...HOLDS_SEATS, 'waitlisted'];

// --- справочники ---

const userById = (id: string) => Object.values(users).find((u) => u.id === id)!;
const userShort = (id: string): UserShort => short(userById(id));
const fullName = (id: string) => {
  const u = userById(id);
  return `${u.first_name} ${u.last_name ?? ''}`.trim();
};

function findTrip(id: string): MockTrip {
  const trip = trips.find((t) => t.id === id);
  if (!trip) throw fail(404, 'not_found');
  return trip;
}

function findBooking(id: string): MockBooking {
  const b = bookings.find((x) => x.id === id);
  if (!b) throw fail(404, 'not_found');
  return b;
}

function permissionsFor(trip: MockTrip): TripPermissions {
  if (trip.created_by === ME) return { manage: true, scan: true, read_bookings: true };
  const m = memberships.find((x) => x.user_id === ME && x.organizer_id === trip.organizer_id);
  const p = m?.permissions ?? [];
  return {
    manage: p.includes('trips.manage'),
    scan: p.includes('tickets.scan'),
    read_bookings: p.includes('bookings.read'),
  };
}

function canConfirm(trip: MockTrip): boolean {
  if (trip.created_by === ME) return true;
  const m = memberships.find((x) => x.user_id === ME && x.organizer_id === trip.organizer_id);
  return !!m?.permissions.includes('bookings.confirm');
}

/** Удержание мест без оплаты истекает через 15 минут (expire_pending_bookings). */
function expireHolds() {
  const now = Date.now();
  for (const b of bookings) {
    if (
      b.status === 'pending_payment' &&
      b.hold_expires_at &&
      Date.parse(b.hold_expires_at) < now
    ) {
      b.status = 'expired';
      findTrip(b.trip_id).seats_taken -= b.seats_count;
    }
  }
}

function myActiveBooking(trip: MockTrip): MockBooking | undefined {
  return bookings.find(
    (b) => b.trip_id === trip.id && b.user_id === ME && ACTIVE.includes(b.status),
  );
}

function toShort(t: MockTrip): TripShort {
  const dir = directions.find((d) => d.id === t.direction_id);
  const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
  const org = t.organizer_id ? organizers[t.organizer_id] : undefined;
  const riders = bookings
    .filter((b) => b.trip_id === t.id && (b.status === 'confirmed' || b.status === 'completed'))
    .map((b) => userShort(b.user_id));
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    title: t.title,
    direction: dir ? { id: dir.id, slug: dir.slug, name: dir.name } : null,
    tags: t.tags,
    departure_at: t.departure_at,
    return_at: t.return_at,
    seats_total: t.seats_total,
    seats_taken: t.seats_taken,
    price: t.price,
    payment_mode: t.payment_mode,
    organizer: org ? (({ commission_percent: _c, ...o }) => o)(org) : null,
    driver:
      t.type === 'carpool'
        ? {
            ...userShort(t.created_by),
            rating: userRatings[t.created_by]?.rating ?? null,
            reviews_count: userRatings[t.created_by]?.reviews_count ?? 0,
          }
        : null,
    vehicle: vehicle ? (({ owner_user_id: _o, organizer_id: _g, ...v }) => v)(vehicle) : null,
    participants_count: t.seats_taken,
    participants_preview: riders.slice(0, 3),
  };
}

function toTrip(t: MockTrip): Trip {
  const mine = myActiveBooking(t);
  return {
    ...toShort(t),
    description: t.description,
    difficulty: t.difficulty,
    min_age: t.min_age,
    included: t.included,
    what_to_bring: t.what_to_bring,
    insurance_included: t.insurance_included,
    booking_closes_at: t.booking_closes_at,
    prepayment_amount: t.prepayment_amount,
    requires_confirmation: t.requires_confirmation,
    free_cancel_hours: t.free_cancel_hours,
    late_cancel_refund_percent: t.late_cancel_refund_percent,
    program: t.program,
    pickup_points: t.pickup_points,
    my_booking: mine
      ? { id: mine.id, code: mine.code, status: mine.status, seats_count: mine.seats_count }
      : null,
    permissions: permissionsFor(t),
  };
}

function hasChatAccess(t: MockTrip): boolean {
  const mine = myActiveBooking(t) ?? bookings.find((b) => b.trip_id === t.id && b.user_id === ME);
  const p = permissionsFor(t);
  return p.read_bookings || mine?.status === 'confirmed' || mine?.status === 'completed';
}

// --- брони и деньги ---

function refundPreview(b: MockBooking, t: MockTrip): number {
  if (!b.paid_at) return 0;
  const left = b.total_amount - b.refunded_amount;
  const hoursBefore = (Date.parse(t.departure_at) - Date.now()) / HOUR;
  if (hoursBefore >= t.free_cancel_hours) return left;
  return Math.round((left * t.late_cancel_refund_percent) / 100);
}

function toBooking(b: MockBooking): Booking {
  const t = findTrip(b.trip_id);
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    seats_count: b.seats_count,
    price_per_seat: b.price_per_seat,
    total_amount: b.total_amount,
    refunded_amount: b.refunded_amount,
    hold_expires_at: b.hold_expires_at,
    paid_at: b.paid_at,
    pickup_point: t.pickup_points.find((p) => p.id === b.pickup_point_id) ?? null,
    created_at: b.created_at,
    trip: toShort(t),
    has_review: b.has_review,
  };
}

function toTicket(tk: (typeof tickets)[number]): Ticket {
  return {
    id: tk.id,
    code: tk.code,
    holder_name: tk.holder_name,
    price: tk.price,
    status: tk.status,
    scanned_at: tk.scanned_at,
  };
}

function toBookingDetails(b: MockBooking): BookingDetails {
  const t = findTrip(b.trip_id);
  return {
    ...toBooking(b),
    tickets: tickets.filter((tk) => tk.booking_id === b.id).map(toTicket),
    refund_preview: refundPreview(b, t),
    free_cancel_until: new Date(
      Date.parse(t.departure_at) - t.free_cancel_hours * HOUR,
    ).toISOString(),
  };
}

function addWalletEntry(type: WalletEntry['type'], amount: number, description: string) {
  wallet.balance += amount;
  wallet.entries.unshift({
    id: `we${Date.now()}${wallet.entries.length}`,
    type,
    amount,
    balance_after: wallet.balance,
    description,
    created_at: new Date().toISOString(),
  });
}

function issueTickets(b: MockBooking, t: MockTrip, prepaid: boolean) {
  const commission = t.organizer_id ? organizers[t.organizer_id]!.commission_percent : 0;
  const names = [fullName(b.user_id), ...b.guests];
  for (let i = 0; i < b.seats_count; i++) {
    tickets.push({
      id: `tk${Date.now()}${i}`,
      booking_id: b.id,
      trip_id: t.id,
      code: ticketCode(),
      holder_name: names[i] ?? `Гость ${i}`,
      price: t.price,
      commission_amount: Math.round((t.price * commission) / 100),
      is_prepaid: prepaid,
      status: 'active',
      scanned_at: null,
    });
  }
}

function joinChat(t: MockTrip, userId: string) {
  messages.push({
    id: nextMessageId(),
    trip_id: t.id,
    type: 'system',
    sender_id: null,
    body: `${fullName(userId)} присоединился к выезду`,
    created_at: new Date().toISOString(),
  });
}

function confirmBooking(b: MockBooking, t: MockTrip) {
  b.status = 'confirmed';
  if (!tickets.some((tk) => tk.booking_id === b.id)) issueTickets(b, t, !!b.paid_at);
  joinChat(t, b.user_id);
}

function cancelBooking(b: MockBooking, byOrganizer: boolean): number {
  const t = findTrip(b.trip_id);
  const allowed: BookingStatus[] = ['waitlisted', 'pending_payment', 'pending', 'confirmed'];
  if (!allowed.includes(b.status)) throw fail(409, 'cannot_cancel');
  const refund = byOrganizer
    ? b.paid_at
      ? b.total_amount - b.refunded_amount
      : 0
    : refundPreview(b, t);
  if (HOLDS_SEATS.includes(b.status)) t.seats_taken -= b.seats_count;
  b.status = byOrganizer ? 'cancelled_by_organizer' : 'cancelled_by_user';
  b.refunded_amount += refund;
  for (const tk of tickets)
    if (tk.booking_id === b.id && tk.status === 'active') tk.status = 'cancelled';
  if (refund > 0 && b.user_id === ME) {
    addWalletEntry('booking_refund', refund, `Возврат · ${t.title}`);
  }
  return refund;
}

// --- сообщения ---

function toMessage(m: (typeof messages)[number]): Message {
  return {
    id: m.id,
    type: m.type,
    sender: m.sender_id ? userShort(m.sender_id) : null,
    body: m.body,
    created_at: m.created_at,
  };
}

function tripMessages(tripId: string) {
  return messages.filter((m) => m.trip_id === tripId).sort((a, b) => b.id - a.id);
}

// --- маршруты ---

type Handler = (params: string[], query: Query, body: unknown) => unknown;

const tokens = (): AuthTokens => ({
  access_token: `mock-access-${Date.now()}`,
  refresh_token: `mock-refresh-${Date.now()}`,
});

function me(): Me {
  const u = users.me;
  return {
    ...short(u),
    phone: u.phone,
    city: meProfile.city,
    about: meProfile.about,
    rating: meProfile.rating,
    reviews_count: meProfile.reviews_count,
    trips_finished: bookings.filter((b) => b.user_id === ME && b.status === 'completed').length,
    wallet_balance: wallet.balance,
    organizers: memberships
      .filter((m) => m.user_id === ME)
      .map((m) => {
        const { commission_percent: _c, ...organizer } = organizers[m.organizer_id]!;
        return { organizer, roles: m.roles, permissions: m.permissions };
      }),
  };
}

function directionsWithCounts(): Direction[] {
  const now = Date.now();
  return directions.map((d) => ({
    ...d,
    trips_count: trips.filter(
      (t) =>
        t.direction_id === d.id && t.status === 'published' && Date.parse(t.departure_at) > now,
    ).length,
  }));
}

const routes: [string, RegExp, Handler][] = [
  // --- вход ---
  ['POST', /^\/auth\/sms$/, () => undefined],
  [
    'POST',
    /^\/auth\/verify$/,
    (_p, _q, body) => {
      const { code } = body as { code: string };
      if (code === '0000') throw fail(422, 'invalid_code', '', { code: 'Неверный код' });
      return tokens();
    },
  ],
  ['POST', /^\/auth\/refresh$/, () => tokens()],

  // --- профиль ---
  ['GET', /^\/me$/, () => me()],
  [
    'PATCH',
    /^\/me$/,
    (_p, _q, body) => {
      const patch = body as Partial<Me>;
      if (patch.first_name !== undefined) users.me.first_name = patch.first_name;
      if (patch.last_name !== undefined) users.me.last_name = patch.last_name;
      if (patch.city !== undefined) meProfile.city = patch.city;
      return me();
    },
  ],
  [
    'GET',
    /^\/me\/bookings$/,
    () =>
      bookings
        .filter((b) => b.user_id === ME && b.status !== 'expired')
        .sort((a, b) =>
          findTrip(a.trip_id).departure_at.localeCompare(findTrip(b.trip_id).departure_at),
        )
        .map(toBooking),
  ],
  [
    'GET',
    /^\/me\/trips$/,
    () =>
      trips
        .filter((t) => {
          const p = permissionsFor(t);
          return t.created_by === ME || p.read_bookings || p.scan;
        })
        .sort((a, b) => a.departure_at.localeCompare(b.departure_at))
        .map(toShort),
  ],
  [
    'GET',
    /^\/me\/chats$/,
    (): ChatPreview[] =>
      trips
        .filter(hasChatAccess)
        .map((t) => {
          const list = tripMessages(t.id);
          const read = lastRead[t.id] ?? 0;
          return {
            trip: toShort(t),
            last_message: list[0] ? toMessage(list[0]) : null,
            unread_count: list.filter((m) => m.id > read && m.sender_id !== ME).length,
          };
        })
        .sort((a, b) =>
          (b.last_message?.created_at ?? '').localeCompare(a.last_message?.created_at ?? ''),
        ),
  ],
  [
    'GET',
    /^\/me\/vehicles$/,
    () =>
      vehicles
        .filter((v) => v.owner_user_id === ME)
        .map(({ owner_user_id: _o, organizer_id: _g, ...v }) => v),
  ],
  [
    'POST',
    /^\/me\/vehicles$/,
    (_p, _q, body) => {
      const v = body as CreateVehicleBody;
      if (!v.brand.trim() || !v.model.trim()) {
        throw fail(422, 'validation', '', { brand: 'Укажите марку и модель' });
      }
      const created = { ...v, id: `v${Date.now()}`, owner_user_id: ME };
      vehicles.push(created);
      const { owner_user_id: _o, ...out } = created;
      return out;
    },
  ],
  ['GET', /^\/me\/wallet$/, () => wallet],
  [
    'POST',
    /^\/me\/wallet\/withdraw$/,
    (_p, _q, body) => {
      const { amount } = body as { amount: number };
      if (amount <= 0 || amount > wallet.balance) throw fail(409, 'insufficient_funds');
      addWalletEntry('wallet_withdrawal', -amount, 'Возврат на карту •• 4417');
      return wallet;
    },
  ],

  // --- лента и выезды ---
  [
    'GET',
    /^\/trips$/,
    (_p, q) => {
      expireHolds();
      const now = Date.now();
      const search = String(q?.q ?? '')
        .trim()
        .toLowerCase();
      const items = trips
        .filter((t) => t.status === 'published' && Date.parse(t.departure_at) >= now)
        .filter((t) => !q?.direction_id || t.direction_id === q.direction_id)
        .filter((t) => !q?.type || t.type === q.type)
        .filter((t) => !q?.tag || t.tags.includes(String(q.tag)))
        .filter((t) => !search || t.title.toLowerCase().includes(search))
        .filter((t) => {
          const oneDay = !t.return_at || t.departure_at.slice(0, 10) === t.return_at.slice(0, 10);
          if (q?.format === 'day') return oneDay;
          if (q?.format === 'weekend') return !oneDay;
          return true;
        })
        .sort((a, b) => a.departure_at.localeCompare(b.departure_at))
        .map(toShort);
      const start = Number(q?.cursor ?? 0) || 0;
      const size = Number(q?.limit ?? 20) || 20;
      return {
        items: items.slice(start, start + size),
        next_cursor: start + size < items.length ? String(start + size) : null,
      } satisfies Page<TripShort>;
    },
  ],
  [
    'GET',
    /^\/trips\/([^/]+)$/,
    ([id]) => {
      expireHolds();
      return toTrip(findTrip(id!));
    },
  ],
  [
    'POST',
    /^\/trips$/,
    (_p, _q, body) => {
      const b = body as CreateTripBody;
      if (b.type === 'company') throw fail(422, 'validation', 'Поиск компании появится в v2');
      if (b.type === 'tour') {
        const m = memberships.find((x) => x.user_id === ME && x.organizer_id === b.organizer_id);
        if (!m?.permissions.includes('trips.manage')) {
          throw fail(
            403,
            'tour_not_allowed',
            'Туры публикуют сотрудники организатора с правом «Выезды»',
          );
        }
      } else {
        const v = vehicles.find((x) => x.id === b.vehicle_id && x.owner_user_id === ME);
        if (!v) throw fail(422, 'vehicle_required', '', { vehicle_id: 'Выберите машину' });
        if (b.seats_total > v.passenger_seats) {
          throw fail(422, 'vehicle_seats', '', {
            seats_total: `В машине только ${v.passenger_seats} пассажирских места`,
          });
        }
        if (b.payment_mode !== 'offline') throw fail(422, 'validation', 'Попутки — только офлайн');
      }
      const trip: MockTrip = {
        id: `t${Date.now()}`,
        type: b.type,
        status: 'published',
        organizer_id: b.organizer_id,
        created_by: ME,
        vehicle_id: b.vehicle_id,
        direction_id: b.direction_id,
        title: b.title,
        description: b.description,
        tags: b.tags,
        difficulty: null,
        min_age: null,
        included: b.included,
        what_to_bring: b.what_to_bring,
        insurance_included: b.insurance_included,
        departure_at: b.departure_at,
        return_at: b.return_at,
        booking_closes_at: b.booking_closes_at,
        seats_total: b.seats_total,
        seats_taken: 0,
        price: b.price,
        prepayment_amount: 0,
        payment_mode: b.payment_mode,
        requires_confirmation: b.requires_confirmation,
        free_cancel_hours: b.free_cancel_hours,
        late_cancel_refund_percent: b.late_cancel_refund_percent,
        program: b.program,
        pickup_points: b.pickup_points.map((p, i) => ({ ...p, id: `pp${Date.now()}${i}` })),
      };
      trips.push(trip);
      return toTrip(trip);
    },
  ],

  // --- бронирование ---
  [
    'POST',
    /^\/trips\/([^/]+)\/bookings$/,
    ([id], _q, body): BookingDetails => {
      expireHolds();
      const t = findTrip(id!);
      const req = body as CreateBookingBody;
      if (Date.parse(t.booking_closes_at) < Date.now()) throw fail(409, 'booking_closed');
      if (t.created_by === ME) throw fail(409, 'own_trip');
      if (myActiveBooking(t)) throw fail(409, 'already_booked');
      if (t.seats_taken + req.seats_count > t.seats_total) {
        throw fail(409, 'seats_full', 'Свободных мест нет');
      }
      const online = t.payment_mode === 'online';
      const b: MockBooking = {
        id: `b${Date.now()}`,
        code: bookingCode(),
        trip_id: t.id,
        user_id: ME,
        status: online ? 'pending_payment' : t.requires_confirmation ? 'pending' : 'confirmed',
        seats_count: req.seats_count,
        price_per_seat: t.price,
        total_amount: t.price * req.seats_count,
        refunded_amount: 0,
        hold_expires_at: online ? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() : null,
        paid_at: null,
        pickup_point_id: req.pickup_point_id,
        guests: req.guests,
        has_review: false,
        created_at: new Date().toISOString(),
      };
      bookings.push(b);
      t.seats_taken += b.seats_count;
      if (b.status === 'confirmed') confirmBooking(b, t);
      return toBookingDetails(b);
    },
  ],
  [
    'POST',
    /^\/trips\/([^/]+)\/waitlist$/,
    ([id], _q, body): BookingDetails => {
      const t = findTrip(id!);
      if (myActiveBooking(t)) throw fail(409, 'already_booked');
      const seats = (body as { seats_count?: number } | undefined)?.seats_count ?? 1;
      const b: MockBooking = {
        id: `b${Date.now()}`,
        code: bookingCode(),
        trip_id: t.id,
        user_id: ME,
        status: 'waitlisted',
        seats_count: seats,
        price_per_seat: t.price,
        total_amount: t.price * seats,
        refunded_amount: 0,
        hold_expires_at: null,
        paid_at: null,
        pickup_point_id: t.pickup_points[0]?.id ?? null,
        guests: [],
        has_review: false,
        created_at: new Date().toISOString(),
      };
      bookings.push(b);
      return toBookingDetails(b);
    },
  ],
  [
    'GET',
    /^\/bookings\/([^/]+)$/,
    ([id]) => {
      expireHolds();
      return toBookingDetails(findBooking(id!));
    },
  ],
  [
    'POST',
    /^\/bookings\/([^/]+)\/pay$/,
    ([id], _q, body): BookingDetails => {
      expireHolds();
      const b = findBooking(id!);
      const t = findTrip(b.trip_id);
      if (b.status === 'expired') throw fail(409, 'hold_expired');
      if (b.status !== 'pending_payment') throw fail(409, 'not_payable');
      const { method } = body as { method: PayMethod };
      if (method === 'wallet' && wallet.balance < b.total_amount)
        throw fail(409, 'insufficient_funds');
      // card_payment: карта → кошелёк, затем booking_payment: кошелёк → эскроу (pay_booking)
      if (method === 'card')
        addWalletEntry('card_payment', b.total_amount, 'Оплата картой •• 4417');
      addWalletEntry('booking_payment', -b.total_amount, `Оплата брони · ${t.title}`);
      b.paid_at = new Date().toISOString();
      b.hold_expires_at = null;
      if (t.requires_confirmation) {
        b.status = 'pending';
        issueTickets(b, t, true);
      } else {
        confirmBooking(b, t);
      }
      return toBookingDetails(b);
    },
  ],
  [
    'DELETE',
    /^\/bookings\/([^/]+)$/,
    ([id]) => {
      const b = findBooking(id!);
      const refunded = cancelBooking(b, false);
      return { refunded };
    },
  ],
  [
    'POST',
    /^\/bookings\/([^/]+)\/review$/,
    ([id], _q, body) => {
      const b = findBooking(id!);
      if (b.status !== 'completed')
        throw fail(409, 'validation', 'Отзыв можно оставить после поездки');
      if (b.has_review) throw fail(409, 'validation', 'Вы уже оставили отзыв');
      const { rating } = body as { rating: number };
      if (rating < 1 || rating > 5)
        throw fail(422, 'validation', '', { rating: 'Оценка от 1 до 5' });
      b.has_review = true;
      return toBookingDetails(b);
    },
  ],

  // --- организатор: участники, подтверждение, скан ---
  [
    'GET',
    /^\/trips\/([^/]+)\/bookings$/,
    ([id]): TripBooking[] => {
      const t = findTrip(id!);
      if (!permissionsFor(t).read_bookings) throw fail(403, 'forbidden');
      return bookings
        .filter((b) => b.trip_id === t.id && b.status !== 'expired')
        .map((b) => {
          const u = userById(b.user_id);
          return {
            id: b.id,
            code: b.code,
            status: b.status,
            seats_count: b.seats_count,
            total_amount: b.total_amount,
            paid_at: b.paid_at,
            user: { ...short(u), phone: u.phone },
            guests: b.guests,
            tickets_used: tickets.filter((tk) => tk.booking_id === b.id && tk.status === 'used')
              .length,
          };
        });
    },
  ],
  [
    'POST',
    /^\/bookings\/([^/]+)\/confirm$/,
    ([id]) => {
      const b = findBooking(id!);
      const t = findTrip(b.trip_id);
      if (!canConfirm(t)) throw fail(403, 'forbidden');
      if (b.status !== 'pending') throw fail(409, 'validation', 'Бронь не ждёт подтверждения');
      confirmBooking(b, t);
      return undefined;
    },
  ],
  [
    'POST',
    /^\/bookings\/([^/]+)\/decline$/,
    ([id]) => {
      const b = findBooking(id!);
      if (!canConfirm(findTrip(b.trip_id))) throw fail(403, 'forbidden');
      cancelBooking(b, true);
      return undefined;
    },
  ],
  [
    'POST',
    /^\/tickets\/scan$/,
    (_p, _q, body): ScanResult => {
      const code = String((body as { code: string }).code)
        .trim()
        .toLowerCase();
      const tk = tickets.find((x) => x.code === code);
      if (!tk) throw fail(404, 'ticket_not_found');
      const t = findTrip(tk.trip_id);
      if (!permissionsFor(t).scan) throw fail(403, 'no_scan_access');
      if (tk.status === 'used') {
        const time = new Date(tk.scanned_at!).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
        throw fail(409, 'ticket_already_scanned', `Билет уже отсканирован в ${time}`);
      }
      if (tk.status !== 'active') throw fail(409, 'ticket_invalid');
      const now = Date.now();
      const from = Date.parse(t.departure_at) - SCAN_WINDOW_MS;
      const to = Date.parse(t.return_at ?? t.departure_at) + SCAN_WINDOW_MS;
      if (now < from || now > to) throw fail(409, 'scan_window');
      tk.status = 'used';
      tk.scanned_at = new Date().toISOString();
      const b = findBooking(tk.booking_id);
      if (tickets.filter((x) => x.booking_id === b.id).every((x) => x.status === 'used')) {
        b.status = 'completed';
      }
      return {
        ticket: toTicket(tk),
        holder_name: tk.holder_name ?? fullName(b.user_id),
        booking_code: b.code,
        trip_title: t.title,
        released_amount: tk.is_prepaid ? tk.price - tk.commission_amount : 0,
      };
    },
  ],
  /** Только для моков: коды билетов, которые я могу отсканировать. */
  [
    'GET',
    /^\/__mock\/scan-codes$/,
    () =>
      tickets
        .filter((tk) => tk.status === 'active' && permissionsFor(findTrip(tk.trip_id)).scan)
        .map((tk) => ({
          code: tk.code,
          holder_name: tk.holder_name,
          trip_title: findTrip(tk.trip_id).title,
        })),
  ],

  // --- чат ---
  [
    'GET',
    /^\/trips\/([^/]+)\/messages$/,
    ([id], q): Page<Message> => {
      const t = findTrip(id!);
      if (!hasChatAccess(t)) throw fail(403, 'forbidden');
      lastRead[t.id] = tripMessages(t.id)[0]?.id ?? 0;
      const before = q?.before ? Number(q.before) : Infinity;
      const limit = Number(q?.limit ?? 50);
      const list = tripMessages(t.id).filter((m) => m.id < before);
      const items = list.slice(0, limit).map(toMessage);
      const last = items[items.length - 1];
      return { items, next_cursor: list.length > limit && last ? String(last.id) : null };
    },
  ],

  // --- направления, уведомления, устройства ---
  [
    'GET',
    /^\/directions$/,
    (_p, q) => {
      const search = String(q?.q ?? '')
        .trim()
        .toLowerCase();
      const season = q?.season as string | undefined;
      return directionsWithCounts()
        .filter((d) => !search || d.name.toLowerCase().includes(search))
        .filter((d) => !season || d.seasons.includes(season as Direction['seasons'][number]));
    },
  ],
  ['GET', /^\/notifications$/, () => notifications],
  [
    'GET',
    /^\/notifications\/unread-count$/,
    () => ({ count: notifications.filter((n) => !n.read_at).length }),
  ],
  [
    'POST',
    /^\/notifications\/read$/,
    () => {
      const now = new Date().toISOString();
      for (const n of notifications) n.read_at ??= now;
      return undefined;
    },
  ],
  ['POST', /^\/devices$/, () => undefined],
];

export async function mockRequest<T>(
  method: string,
  path: string,
  query: Query,
  body: unknown,
): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const match = pattern.exec(path);
    if (match) return clone(handler(match.slice(1), query, body)) as T;
  }
  throw fail(404, 'not_found', `Нет мока для ${method} ${path}`);
}

/** Для мок-сокета чата: сохраняет моё сообщение и возвращает его в формате API. */
export function mockStoreMessage(tripId: string, text: string): Message {
  const m = {
    id: nextMessageId(),
    trip_id: tripId,
    type: 'text' as const,
    sender_id: ME,
    body: text,
    created_at: new Date().toISOString(),
  };
  messages.push(m);
  lastRead[tripId] = m.id;
  return toMessage(m);
}
