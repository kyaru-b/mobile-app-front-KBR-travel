/**
 * Модели API по схеме БД KBR-travel (db/schema.sql). Пока openapi.yaml нет, описаны вручную;
 * после генерации клиента файл заменяется сгенерированными типами.
 * Даты — ISO 8601 с часовым поясом. Цены в API — целые копейки (в БД numeric рубли).
 */

/** trip_type: тур от ИП/самозанятого, попутка на своей машине, компания (v2). */
export type TripType = 'tour' | 'carpool' | 'company';
export type TripStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
/** online — оплата в приложении, деньги у платформы до скана; offline — оплата организатору. */
export type PaymentMode = 'online' | 'offline';
export type VehicleType = 'car' | 'minivan' | 'minibus' | 'bus' | 'offroad';
export type Season = 'winter' | 'summer';

/** Фильтр ленты по длительности (считается по departure_at / return_at). */
export type FeedFormat = 'day' | 'weekend';

export type BookingStatus =
  | 'waitlisted'
  | 'pending_payment'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled_by_user'
  | 'cancelled_by_organizer'
  | 'expired';

export type TicketStatus = 'active' | 'used' | 'settled' | 'cancelled';
export type MessageType = 'text' | 'image' | 'system' | 'poll' | 'expense';

export type UserShort = {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url?: string | null;
};

export type Rating = { rating: number | null; reviews_count: number };

export type OrganizerShort = Rating & {
  id: string;
  display_name: string;
  legal_type: 'individual_entrepreneur' | 'self_employed';
  /** organizer_status = active: прошёл проверку модератором. */
  verified: boolean;
  logo_url?: string | null;
  experience_years: number | null;
};

export type Vehicle = {
  id: string;
  type: VehicleType;
  brand: string;
  model: string;
  color: string | null;
  plate_number: string;
  passenger_seats: number;
};

export type DirectionShort = {
  id: string;
  slug: string;
  name: string;
};

export type Direction = DirectionShort & {
  region: string;
  description: string | null;
  elevation_m: number | null;
  cover_url: string | null;
  /** Ниже — поля, которых нет в таблице directions; их считает API (нужно согласовать). */
  seasons: Season[];
  travel_minutes: number;
  trips_count: number;
};

export type ProgramItem = {
  starts_at: string | null;
  title: string;
  description?: string | null;
};

export type PickupPoint = {
  id: string;
  title: string;
  address: string | null;
  pickup_at: string;
};

export type MyBookingShort = {
  id: string;
  code: string;
  status: BookingStatus;
  seats_count: number;
};

export type TripShort = {
  id: string;
  type: TripType;
  status: TripStatus;
  title: string;
  direction: DirectionShort | null;
  tags: string[];
  departure_at: string;
  return_at: string | null;
  seats_total: number;
  seats_taken: number;
  price: number;
  payment_mode: PaymentMode;
  organizer: OrganizerShort | null;
  /** Водитель попутки или создатель выезда. */
  driver: (UserShort & Rating) | null;
  vehicle: Vehicle | null;
  participants_count: number;
  participants_preview: UserShort[];
};

/** Что текущий пользователь может делать с выездом — считает API по ролям. */
export type TripPermissions = {
  manage: boolean;
  scan: boolean;
  read_bookings: boolean;
};

export type Trip = TripShort & {
  description: string | null;
  difficulty: number | null;
  min_age: number | null;
  included: string[];
  what_to_bring: string[];
  insurance_included: boolean;
  booking_closes_at: string;
  prepayment_amount: number;
  requires_confirmation: boolean;
  free_cancel_hours: number;
  late_cancel_refund_percent: number;
  program: ProgramItem[];
  pickup_points: PickupPoint[];
  my_booking: MyBookingShort | null;
  permissions: TripPermissions;
};

export type Ticket = {
  id: string;
  code: string;
  holder_name: string | null;
  price: number;
  status: TicketStatus;
  scanned_at: string | null;
};

export type Booking = {
  id: string;
  code: string;
  status: BookingStatus;
  seats_count: number;
  price_per_seat: number;
  total_amount: number;
  refunded_amount: number;
  hold_expires_at: string | null;
  paid_at: string | null;
  pickup_point: PickupPoint | null;
  created_at: string;
  trip: TripShort;
  has_review: boolean;
};

export type BookingDetails = Booking & {
  tickets: Ticket[];
  /** Сколько вернётся при отмене прямо сейчас (по free_cancel_hours / late_cancel_refund_percent). */
  refund_preview: number;
  free_cancel_until: string;
};

/** Участник выезда в списке у организатора. */
export type TripBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  seats_count: number;
  total_amount: number;
  paid_at: string | null;
  user: UserShort & { phone: string };
  guests: string[];
  tickets_used: number;
};

export type ScanResult = {
  ticket: Ticket;
  holder_name: string;
  booking_code: string;
  trip_title: string;
  /** Сколько ушло организатору за это место (online), 0 для offline. */
  released_amount: number;
};

export type Message = {
  id: number;
  client_id?: string | null;
  type: MessageType;
  /** null у системных сообщений. */
  sender: UserShort | null;
  body: string | null;
  created_at: string;
};

export type ChatPreview = {
  trip: TripShort;
  last_message: Message | null;
  unread_count: number;
};

export type OrganizerMembership = {
  organizer: OrganizerShort;
  roles: string[];
  permissions: string[];
};

export type Me = UserShort & {
  phone: string;
  city: string | null;
  about: string | null;
  rating: number | null;
  reviews_count: number;
  trips_finished: number;
  wallet_balance: number;
  organizers: OrganizerMembership[];
};

export type WalletEntryType =
  'card_payment' | 'booking_payment' | 'booking_refund' | 'wallet_withdrawal' | 'adjustment';

export type WalletEntry = {
  id: string;
  type: WalletEntryType;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
};

export type Wallet = {
  balance: number;
  entries: WalletEntry[];
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { trip_id?: string; booking_id?: string } | null;
  read_at: string | null;
  created_at: string;
};

export type Page<T> = {
  items: T[];
  next_cursor: string | null;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type CreateVehicleBody = Omit<Vehicle, 'id'>;

export type CreateTripBody = {
  type: TripType;
  organizer_id: string | null;
  vehicle_id: string | null;
  direction_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  departure_at: string;
  return_at: string | null;
  booking_closes_at: string;
  seats_total: number;
  price: number;
  payment_mode: PaymentMode;
  requires_confirmation: boolean;
  free_cancel_hours: number;
  late_cancel_refund_percent: number;
  insurance_included: boolean;
  included: string[];
  what_to_bring: string[];
  program: ProgramItem[];
  pickup_points: Omit<PickupPoint, 'id'>[];
};

export type CreateBookingBody = {
  seats_count: number;
  pickup_point_id: string | null;
  guests: string[];
};

export type PayMethod = 'card' | 'wallet';

export type DevicePlatform = 'ios' | 'android';
