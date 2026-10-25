const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'нояб',
  'дек',
];
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** plural(5, ['место', 'места', 'мест']) → 'мест' */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export function pluralize(n: number, forms: readonly [string, string, string]): string {
  return `${n} ${plural(n, forms)}`;
}

const NBSP = ' ';

/** Цена приходит в копейках: 350000 → «3 500 ₽». */
export function formatPrice(kopecks: number): string {
  const rubles = Math.round(kopecks / 100);
  const grouped = String(rubles).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${grouped}${NBSP}₽`;
}

export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** «06:00» */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** «Сб, 2 ноября» */
export function formatDayLong(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «Вс, 3 нояб» */
export function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** «2 ноября, сб» — значение поля даты в форме. */
export function formatDateField(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${WEEKDAYS[d.getDay()]?.toLowerCase()}`;
}

export function formatTimeField(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Диапазон выезда: «8–9 нояб» для нескольких дней, «Вс, 3 нояб» для одного. */
export function formatTripDates(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (isSameDay(s, e)) return formatDayShort(startIso);
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[s.getMonth()]}`;
  }
  return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`;
}

export function isOneDay(startIso: string, endIso: string): boolean {
  return isSameDay(new Date(startIso), new Date(endIso));
}

/** Время в ленте чатов: «12:40», «вчера», «12 окт». */
export function formatChatTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (isSameDay(d, now)) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'вчера';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Время в пути в минутах: 90 → «~1,5 ч». */
export function formatTravelTime(minutes: number): string {
  const hours = minutes / 60;
  const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
  return `~${value} ч`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Только цифры номера без +7: «9001234512». */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

/** Маска ввода: «900 123-45-12». */
export function formatPhoneInput(digits: string): string {
  const d = phoneDigits(digits);
  let out = d.slice(0, 3);
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/** Скрытый номер: «+7 900 •••-••-12». */
export function maskPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(-10);
  return `+7 ${d.slice(0, 3)} •••-••-${d.slice(8, 10)}`;
}
