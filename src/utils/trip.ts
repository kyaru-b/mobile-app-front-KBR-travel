import type {
  BookingStatus,
  PaymentMode,
  TripShort,
  TripType,
  UserShort,
  Vehicle,
  VehicleType,
} from '@/api/types';

import { formatPrice, isOneDay, plural, pluralize } from './format';

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  tour: 'Тур с гидом',
  carpool: 'Попутка',
  company: 'Компания',
};

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  online: 'Оплата в приложении',
  offline: 'Оплата на месте',
};

type Tone = 'success' | 'warning' | 'muted' | 'accent' | 'danger';

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  waitlisted: { label: 'Лист ожидания', tone: 'warning' },
  pending_payment: { label: 'Ждёт оплаты', tone: 'accent' },
  pending: { label: 'Ждёт подтверждения', tone: 'warning' },
  confirmed: { label: 'Подтверждена', tone: 'success' },
  completed: { label: 'Поездка состоялась', tone: 'muted' },
  no_show: { label: 'Неявка', tone: 'danger' },
  cancelled_by_user: { label: 'Отменена вами', tone: 'muted' },
  cancelled_by_organizer: { label: 'Отменена организатором', tone: 'danger' },
  expired: { label: 'Не оплачена вовремя', tone: 'muted' },
};

/** Брони, которые ещё «живые» и показываются в «Моих бронях». */
export const ACTIVE_BOOKING: BookingStatus[] = [
  'waitlisted',
  'pending_payment',
  'pending',
  'confirmed',
];

export const TAG_LABEL: Record<string, string> = {
  ski: 'Лыжи',
  hiking: 'Походы',
  lakes: 'Озёра',
};

const VEHICLE_LABEL: Record<VehicleType, string> = {
  car: 'Легковая',
  minivan: 'Минивэн',
  minibus: 'Микроавтобус',
  bus: 'Автобус',
  offroad: 'Внедорожник',
};

export function vehicleLabel(v: Pick<Vehicle, 'type' | 'brand' | 'model'>): string {
  return `${VEHICLE_LABEL[v.type]} ${v.brand} ${v.model}`;
}

export function vehicleShortLabel(v: Pick<Vehicle, 'type'>): string {
  return VEHICLE_LABEL[v.type].toLowerCase();
}

/** «Тимур А.» */
export function shortName(u: Pick<UserShort, 'first_name' | 'last_name'>): string {
  return u.last_name ? `${u.first_name} ${u.last_name[0]}.` : u.first_name;
}

export function fullName(u: Pick<UserShort, 'first_name' | 'last_name'>): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ');
}

const SEATS = ['место', 'места', 'мест'] as const;

export function freeSeats(trip: Pick<TripShort, 'seats_total' | 'seats_taken'>): number {
  return Math.max(0, trip.seats_total - trip.seats_taken);
}

export function seatsLabel(trip: Pick<TripShort, 'seats_total' | 'seats_taken'>): string {
  const free = freeSeats(trip);
  return free === 0 ? 'нет мест' : pluralize(free, SEATS);
}

export function seatsLeftLabel(free: number): string {
  return `${plural(free, ['Остался', 'Осталось', 'Осталось'])} ${pluralize(free, SEATS)}`;
}

export function returnOrDeparture(trip: Pick<TripShort, 'departure_at' | 'return_at'>): string {
  return trip.return_at ?? trip.departure_at;
}

export function durationLabel(trip: Pick<TripShort, 'departure_at' | 'return_at'>): string {
  const end = returnOrDeparture(trip);
  if (isOneDay(trip.departure_at, end)) return 'на 1 день';
  const days =
    Math.round(
      (new Date(end).setHours(0, 0, 0, 0) - new Date(trip.departure_at).setHours(0, 0, 0, 0)) /
        86_400_000,
    ) + 1;
  return days === 2 ? 'на выходные' : `на ${pluralize(days, ['день', 'дня', 'дней'])}`;
}

export function isPast(trip: Pick<TripShort, 'departure_at' | 'return_at'>): boolean {
  return new Date(returnOrDeparture(trip)).getTime() < Date.now();
}

/** Цена так, как её понимает пассажир: у попутки это доля бензина. */
export function priceLabel(trip: Pick<TripShort, 'type' | 'price'>): string {
  if (trip.type === 'company' || trip.price === 0) return 'бесплатно';
  return formatPrice(trip.price);
}

export function priceCaption(trip: Pick<TripShort, 'type'>): string {
  return trip.type === 'carpool' ? 'доля бензина' : 'за место';
}

/** Кто везёт: название организатора тура или имя водителя попутки. */
export function hostName(trip: Pick<TripShort, 'organizer' | 'driver'>): string {
  if (trip.organizer) return trip.organizer.display_name;
  if (trip.driver) return shortName(trip.driver);
  return '';
}
