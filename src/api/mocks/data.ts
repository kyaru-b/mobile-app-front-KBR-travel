/**
 * Тестовые данные в форме таблиц из db/schema.sql: users, organizers, vehicles,
 * directions, trips, bookings, tickets, chat_messages, notifications.
 * Суммы — в копейках, как в API.
 */
import type {
  Direction,
  MessageType,
  OrganizerShort,
  PaymentMode,
  PickupPoint,
  ProgramItem,
  TripStatus,
  TripType,
  UserShort,
  Vehicle,
  WalletEntry,
} from '../types';

export function at(daysFromNow: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

let seq = 0;
/** 32 hex-символа, как tickets.code. */
export function ticketCode(): string {
  seq += 1;
  let out = '';
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out.slice(0, 28) + seq.toString(16).padStart(4, '0');
}

/** Короткий код брони: VM-7F3K2. */
export function bookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'VM-';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// --- users ---

export type MockUser = UserShort & { phone: string };

const me: MockUser = { id: 'u_me', first_name: 'Тимур', last_name: 'Абаев', phone: '+79001234512' };

export const users = {
  me,
  artem: { id: 'u_artem', first_name: 'Артём', last_name: 'Маремуков', phone: '+79280000001' },
  azamat: { id: 'u_azamat', first_name: 'Азамат', last_name: 'Кумыков', phone: '+79280000002' },
  daria: { id: 'u_daria', first_name: 'Дарья', last_name: 'Кодзокова', phone: '+79280000003' },
  liza: { id: 'u_liza', first_name: 'Лиза', last_name: 'Сабанова', phone: '+79280000004' },
  ruslan: { id: 'u_ruslan', first_name: 'Руслан', last_name: 'Бжахов', phone: '+79280000005' },
  kantemir: {
    id: 'u_kantemir',
    first_name: 'Кантемир',
    last_name: 'Хагуров',
    phone: '+79280000006',
  },
} satisfies Record<string, MockUser>;

export const short = ({ id, first_name, last_name }: MockUser): UserShort => ({
  id,
  first_name,
  last_name,
});

export const meProfile = {
  city: 'Нальчик' as string | null,
  about: null as string | null,
  rating: 5 as number | null,
  reviews_count: 3,
};

export const userRatings: Record<string, { rating: number; reviews_count: number }> = {
  u_ruslan: { rating: 4.7, reviews_count: 23 },
  u_daria: { rating: 4.9, reviews_count: 11 },
  u_me: { rating: 5, reviews_count: 3 },
};

// --- organizers: только ИП и самозанятые ---

export type MockOrganizer = OrganizerShort & { commission_percent: number };

export const organizers: Record<string, MockOrganizer> = {
  o_elbrus: {
    id: 'o_elbrus',
    display_name: 'Эльбрус Гид',
    legal_type: 'individual_entrepreneur',
    verified: true,
    experience_years: 8,
    rating: 4.9,
    reviews_count: 140,
    commission_percent: 10,
  },
  o_azamat: {
    id: 'o_azamat',
    display_name: 'Горы с Азаматом',
    legal_type: 'self_employed',
    verified: true,
    experience_years: 5,
    rating: 4.8,
    reviews_count: 37,
    commission_percent: 0,
  },
};

/** Я — гид у «Горы с Азаматом»: вижу участников и сканирую билеты. */
export const memberships = [
  {
    organizer_id: 'o_azamat',
    user_id: 'u_me',
    roles: ['guide'],
    permissions: ['bookings.read', 'bookings.attendance', 'tickets.scan', 'trips.status.update'],
  },
];

// --- vehicles ---

export const vehicles: (Vehicle & { owner_user_id?: string; organizer_id?: string })[] = [
  {
    id: 'v_sprinter',
    organizer_id: 'o_elbrus',
    type: 'minibus',
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    color: 'белый',
    plate_number: 'А123ВС07',
    passenger_seats: 18,
  },
  {
    id: 'v_h1',
    organizer_id: 'o_azamat',
    type: 'minivan',
    brand: 'Hyundai',
    model: 'H-1',
    color: 'серебристый',
    plate_number: 'К777МН07',
    passenger_seats: 8,
  },
  {
    id: 'v_camry',
    owner_user_id: 'u_me',
    type: 'car',
    brand: 'Toyota',
    model: 'Camry',
    color: 'чёрный',
    plate_number: 'Е505КХ07',
    passenger_seats: 3,
  },
  {
    id: 'v_vesta',
    owner_user_id: 'u_ruslan',
    type: 'car',
    brand: 'Lada',
    model: 'Vesta',
    color: 'синий',
    plate_number: 'О312АР07',
    passenger_seats: 3,
  },
  {
    id: 'v_duster',
    owner_user_id: 'u_daria',
    type: 'offroad',
    brand: 'Renault',
    model: 'Duster',
    color: 'оранжевый',
    plate_number: 'Т808ТТ07',
    passenger_seats: 4,
  },
];

// --- directions (db/seed.sql) + поля, которые считает API ---

type DirectionSeed = Omit<Direction, 'trips_count'>;

export const directions: DirectionSeed[] = [
  {
    id: 'd_elbrus',
    slug: 'elbrus',
    name: 'Эльбрус (Азау, Терскол)',
    region: 'Кабардино-Балкарская Республика',
    description: 'Канатка до 3 847 м, склоны Азау',
    elevation_m: 2350,
    cover_url: null,
    seasons: ['winter', 'summer'],
    travel_minutes: 180,
  },
  {
    id: 'd_cheget',
    slug: 'cheget',
    name: 'Чегет',
    region: 'Кабардино-Балкарская Республика',
    description: 'Фрирайд и вид на Донгуз-Орун',
    elevation_m: 2100,
    cover_url: null,
    seasons: ['winter'],
    travel_minutes: 180,
  },
  {
    id: 'd_lakes',
    slug: 'blue-lakes',
    name: 'Голубые озёра',
    region: 'Кабардино-Балкарская Республика',
    description: 'Озеро Церик-Кёль',
    elevation_m: 809,
    cover_url: null,
    seasons: ['summer', 'winter'],
    travel_minutes: 90,
  },
  {
    id: 'd_chegem',
    slug: 'chegem-waterfalls',
    name: 'Чегемские водопады',
    region: 'Кабардино-Балкарская Республика',
    description: 'Ущелье, канатная тропа',
    elevation_m: 900,
    cover_url: null,
    seasons: ['summer', 'winter'],
    travel_minutes: 60,
  },
  {
    id: 'd_balkaria',
    slug: 'upper-balkaria',
    name: 'Верхняя Балкария',
    region: 'Кабардино-Балкарская Республика',
    description: 'Крепость Зылги, башня Абаевых',
    elevation_m: 1150,
    cover_url: null,
    seasons: ['summer'],
    travel_minutes: 120,
  },
  {
    id: 'd_bezengi',
    slug: 'bezengi',
    name: 'Безенги',
    region: 'Кабардино-Балкарская Республика',
    description: 'Ледник и альплагерь',
    elevation_m: 1550,
    cover_url: null,
    seasons: ['summer'],
    travel_minutes: 150,
  },
  {
    id: 'd_jily',
    slug: 'jily-su',
    name: 'Джилы-Су',
    region: 'Кабардино-Балкарская Республика',
    description: 'Нарзаны, водопад Султан',
    elevation_m: 2400,
    cover_url: null,
    seasons: ['summer'],
    travel_minutes: 240,
  },
  {
    id: 'd_dombay',
    slug: 'dombay',
    name: 'Домбай',
    region: 'Карачаево-Черкесская Республика',
    description: 'Горнолыжка, Мусса-Ачитара',
    elevation_m: 1600,
    cover_url: null,
    seasons: ['winter', 'summer'],
    travel_minutes: 240,
  },
];

// --- trips ---

export type MockTrip = {
  id: string;
  type: TripType;
  status: TripStatus;
  organizer_id: string | null;
  created_by: string;
  vehicle_id: string | null;
  direction_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  difficulty: number | null;
  min_age: number | null;
  included: string[];
  what_to_bring: string[];
  insurance_included: boolean;
  departure_at: string;
  return_at: string | null;
  booking_closes_at: string;
  seats_total: number;
  seats_taken: number;
  price: number;
  prepayment_amount: number;
  payment_mode: PaymentMode;
  requires_confirmation: boolean;
  free_cancel_hours: number;
  late_cancel_refund_percent: number;
  program: ProgramItem[];
  pickup_points: PickupPoint[];
};

function pickup(id: string, title: string, address: string | null, iso: string): PickupPoint {
  return { id, title, address, pickup_at: iso };
}

function tour(t: Partial<MockTrip> & Pick<MockTrip, 'id' | 'title' | 'departure_at'>): MockTrip {
  return {
    type: 'tour',
    status: 'published',
    organizer_id: 'o_elbrus',
    created_by: 'u_artem',
    vehicle_id: 'v_sprinter',
    direction_id: 'd_elbrus',
    description: null,
    tags: [],
    difficulty: 2,
    min_age: null,
    included: ['Трансфер', 'Гид'],
    what_to_bring: ['Тёплая куртка', 'Паспорт'],
    insurance_included: false,
    return_at: null,
    booking_closes_at: new Date(new Date(t.departure_at).getTime() - 12 * 3_600_000).toISOString(),
    seats_total: 8,
    seats_taken: 0,
    price: 350000,
    prepayment_amount: 0,
    payment_mode: 'online',
    requires_confirmation: false,
    free_cancel_hours: 48,
    late_cancel_refund_percent: 50,
    program: [],
    pickup_points: [],
    ...t,
  };
}

export const trips: MockTrip[] = [
  tour({
    id: 't1',
    title: 'Эльбрус: Азау и Чегет',
    description: 'Поднимаемся на канатке до станции «Мир» и смотрим Донгуз-Орун с Чегета.',
    tags: ['ski'],
    departure_at: at(8, 6),
    return_at: at(8, 21),
    seats_taken: 5,
    insurance_included: true,
    what_to_bring: ['Тёплая куртка', 'Очки от солнца', 'Паспорт'],
    program: [
      { starts_at: '06:00', title: 'Сбор у ж/д вокзала' },
      { starts_at: '09:00', title: 'Поляна Азау, канатка на «Мир»' },
      { starts_at: '13:30', title: 'Обед в кафе на поляне' },
      { starts_at: '15:00', title: 'Чегет, вид на Донгуз-Орун' },
      { starts_at: '21:00', title: 'Возвращение в город' },
    ],
    pickup_points: [
      pickup('pp_t1_1', 'Нальчик, ж/д вокзал', 'ул. Канукоева, 2', at(8, 6)),
      pickup('pp_t1_2', 'Нальчик, ТЦ «Галерея»', 'пр. Ленина, 2', at(8, 6, 15)),
    ],
  }),
  {
    id: 't2',
    type: 'carpool',
    status: 'published',
    organizer_id: null,
    created_by: 'u_ruslan',
    vehicle_id: 'v_vesta',
    direction_id: 'd_lakes',
    title: 'Голубые озёра и Чегем',
    description: 'Едем на своей машине, по пути заедем на водопады.',
    tags: ['lakes'],
    difficulty: 1,
    min_age: null,
    included: [],
    what_to_bring: ['Удобная обувь', 'Вода'],
    insurance_included: false,
    departure_at: at(9, 7),
    return_at: at(9, 20),
    booking_closes_at: at(8, 20),
    seats_total: 3,
    seats_taken: 1,
    price: 60000,
    prepayment_amount: 0,
    payment_mode: 'offline',
    requires_confirmation: true,
    free_cancel_hours: 24,
    late_cancel_refund_percent: 0,
    program: [
      { starts_at: '07:00', title: 'Выезд от ТЦ «Галерея»' },
      { starts_at: '09:00', title: 'Озеро Церик-Кёль' },
      { starts_at: '13:00', title: 'Чегемские водопады' },
    ],
    pickup_points: [pickup('pp_t2_1', 'Нальчик, ТЦ «Галерея»', 'пр. Ленина, 2', at(9, 7))],
  },
  tour({
    id: 't3',
    organizer_id: 'o_azamat',
    created_by: 'u_azamat',
    vehicle_id: 'v_h1',
    direction_id: 'd_dombay',
    title: 'Домбай на выходные',
    description: 'Два дня катания, жильё в гостинице у подъёмника.',
    tags: ['ski'],
    departure_at: at(14, 6),
    return_at: at(15, 20),
    seats_taken: 6,
    price: 900000,
    included: ['Трансфер', 'Гид', 'Жильё'],
    what_to_bring: ['Тёплая куртка', 'Паспорт', 'Термос'],
    free_cancel_hours: 72,
    late_cancel_refund_percent: 30,
    program: [
      { starts_at: '06:00', title: 'Сбор у ж/д вокзала' },
      { starts_at: '11:00', title: 'Заселение, канатка на Мусса-Ачитару' },
      { starts_at: '19:00', title: 'Ужин в гостинице' },
    ],
    pickup_points: [pickup('pp_t3_1', 'Нальчик, ж/д вокзал', 'ул. Канукоева, 2', at(14, 6))],
  }),
  tour({
    id: 't4',
    direction_id: 'd_bezengi',
    title: 'Безенги: ледник и альплагерь',
    tags: ['hiking'],
    difficulty: 3,
    min_age: 14,
    departure_at: at(21, 5),
    return_at: at(21, 22),
    seats_total: 10,
    seats_taken: 10,
    price: 420000,
    program: [
      { starts_at: '05:00', title: 'Выезд' },
      { starts_at: '09:00', title: 'Трекинг к леднику' },
    ],
    pickup_points: [pickup('pp_t4_1', 'Нальчик, ж/д вокзал', 'ул. Канукоева, 2', at(21, 5))],
  }),
  {
    id: 't5',
    type: 'carpool',
    status: 'published',
    organizer_id: null,
    created_by: 'u_me',
    vehicle_id: 'v_camry',
    direction_id: 'd_chegem',
    title: 'Попутка на Чегемские водопады',
    description: null,
    tags: [],
    difficulty: 1,
    min_age: null,
    included: [],
    what_to_bring: ['Дождевик'],
    insurance_included: false,
    departure_at: at(5, 8),
    return_at: at(5, 18),
    booking_closes_at: at(4, 22),
    seats_total: 3,
    seats_taken: 1,
    price: 40000,
    prepayment_amount: 0,
    payment_mode: 'offline',
    requires_confirmation: true,
    free_cancel_hours: 24,
    late_cancel_refund_percent: 0,
    program: [{ starts_at: '08:00', title: 'Выезд с площади Абхазии' }],
    pickup_points: [pickup('pp_t5_1', 'Нальчик, пл. Абхазии', null, at(5, 8))],
  },
  tour({
    id: 't6',
    organizer_id: 'o_azamat',
    created_by: 'u_azamat',
    vehicle_id: 'v_h1',
    direction_id: 'd_balkaria',
    title: 'Верхняя Балкария: башни и крепость',
    tags: ['hiking'],
    departure_at: inHours(2),
    return_at: inHours(12),
    booking_closes_at: inHours(1),
    seats_taken: 4,
    price: 250000,
    program: [
      { starts_at: null, title: 'Сбор и посадка по QR-билетам' },
      { starts_at: null, title: 'Крепость Зылги и башня Абаевых' },
    ],
    pickup_points: [pickup('pp_t6_1', 'Нальчик, ж/д вокзал', 'ул. Канукоева, 2', inHours(2))],
  }),
  tour({
    id: 't7',
    direction_id: 'd_dombay',
    title: 'Домбай: Мусса-Ачитара',
    tags: ['ski'],
    status: 'completed',
    departure_at: at(-13, 6),
    return_at: at(-12, 20),
    seats_taken: 8,
    price: 900000,
  }),
  tour({
    id: 't8',
    direction_id: 'd_jily',
    title: 'Джилы-Су: нарзаны и водопад Султан',
    tags: ['hiking'],
    vehicle_id: 'v_sprinter',
    departure_at: at(30, 5),
    return_at: at(30, 22),
    seats_total: 14,
    seats_taken: 3,
    price: 450000,
    payment_mode: 'offline',
    prepayment_amount: 100000,
    requires_confirmation: true,
  }),
  {
    id: 't9',
    type: 'carpool',
    status: 'published',
    organizer_id: null,
    created_by: 'u_daria',
    vehicle_id: 'v_duster',
    direction_id: 'd_elbrus',
    title: 'Попутка на Эльбрус, кататься',
    description: 'Беру лыжи на багажник, место для сноуборда есть.',
    tags: ['ski'],
    difficulty: null,
    min_age: null,
    included: [],
    what_to_bring: [],
    insurance_included: false,
    departure_at: at(3, 6, 30),
    return_at: at(3, 19),
    booking_closes_at: at(2, 22),
    seats_total: 4,
    seats_taken: 2,
    price: 80000,
    prepayment_amount: 0,
    payment_mode: 'offline',
    requires_confirmation: false,
    free_cancel_hours: 12,
    late_cancel_refund_percent: 0,
    program: [],
    pickup_points: [pickup('pp_t9_1', 'Нальчик, Долинск', 'ул. Байсултанова, 1', at(3, 6, 30))],
  },
  tour({
    id: 't10',
    direction_id: 'd_cheget',
    title: 'Чегет: фрирайд с гидом',
    tags: ['ski'],
    difficulty: 4,
    departure_at: at(11, 6),
    return_at: at(11, 20),
    seats_total: 6,
    seats_taken: 2,
    price: 550000,
    insurance_included: true,
  }),
];

// --- bookings / tickets ---

export type MockBooking = {
  id: string;
  code: string;
  trip_id: string;
  user_id: string;
  status: import('../types').BookingStatus;
  seats_count: number;
  price_per_seat: number;
  total_amount: number;
  refunded_amount: number;
  hold_expires_at: string | null;
  paid_at: string | null;
  pickup_point_id: string | null;
  guests: string[];
  has_review: boolean;
  created_at: string;
};

export type MockTicket = {
  id: string;
  booking_id: string;
  trip_id: string;
  code: string;
  holder_name: string | null;
  price: number;
  commission_amount: number;
  is_prepaid: boolean;
  status: import('../types').TicketStatus;
  scanned_at: string | null;
};

export const bookings: MockBooking[] = [];
export const tickets: MockTicket[] = [];

function seedBooking(
  b: Pick<MockBooking, 'trip_id' | 'user_id' | 'status'> & Partial<MockBooking>,
  ticketStatus?: MockTicket['status'],
): MockBooking {
  const trip = trips.find((t) => t.id === b.trip_id)!;
  const seats = b.seats_count ?? 1;
  const booking: MockBooking = {
    id: `b${bookings.length + 1}`,
    code: bookingCode(),
    seats_count: seats,
    price_per_seat: trip.price,
    total_amount: trip.price * seats,
    refunded_amount: 0,
    hold_expires_at: null,
    paid_at: trip.payment_mode === 'online' ? at(-2, 12) : null,
    pickup_point_id: trip.pickup_points[0]?.id ?? null,
    guests: [],
    has_review: false,
    created_at: at(-2, 12),
    ...b,
  };
  bookings.push(booking);
  if (ticketStatus) {
    const holder = Object.values(users).find((u) => u.id === b.user_id)!;
    const commission = trip.organizer_id ? organizers[trip.organizer_id]!.commission_percent : 0;
    for (let i = 0; i < seats; i++) {
      tickets.push({
        id: `tk${tickets.length + 1}`,
        booking_id: booking.id,
        trip_id: trip.id,
        code: ticketCode(),
        holder_name: i === 0 ? `${holder.first_name} ${holder.last_name}` : `Гость ${i}`,
        price: trip.price,
        commission_amount: Math.round((trip.price * commission) / 100),
        is_prepaid: trip.payment_mode === 'online',
        status: ticketStatus,
        scanned_at: ticketStatus === 'used' ? trip.departure_at : null,
      });
    }
  }
  return booking;
}

// Мои брони
seedBooking({ trip_id: 't1', user_id: 'u_me', status: 'confirmed' }, 'active');
seedBooking({ trip_id: 't2', user_id: 'u_me', status: 'pending', paid_at: null });
seedBooking({ trip_id: 't7', user_id: 'u_me', status: 'completed' }, 'used');
// Участники выездов, где я гид или водитель
seedBooking({ trip_id: 't3', user_id: 'u_daria', status: 'confirmed', seats_count: 2 }, 'active');
seedBooking({ trip_id: 't3', user_id: 'u_liza', status: 'confirmed' }, 'active');
seedBooking(
  { trip_id: 't3', user_id: 'u_kantemir', status: 'confirmed', seats_count: 3 },
  'active',
);
seedBooking({ trip_id: 't6', user_id: 'u_daria', status: 'confirmed', seats_count: 2 }, 'active');
seedBooking({ trip_id: 't6', user_id: 'u_kantemir', status: 'confirmed' }, 'active');
seedBooking({ trip_id: 't6', user_id: 'u_liza', status: 'confirmed' }, 'used');
seedBooking({ trip_id: 't5', user_id: 'u_liza', status: 'confirmed', paid_at: null }, 'active');
seedBooking({ trip_id: 't5', user_id: 'u_kantemir', status: 'pending', paid_at: null });

// --- wallet: кошелёк пользователя, двойная запись видна как выписка ---

export const wallet: { balance: number; entries: WalletEntry[] } = {
  balance: 150000,
  entries: [
    {
      id: 'we3',
      type: 'booking_payment',
      amount: -350000,
      balance_after: 150000,
      description: 'Оплата брони · Эльбрус: Азау и Чегет',
      created_at: at(-2, 12, 1),
    },
    {
      id: 'we2',
      type: 'card_payment',
      amount: 350000,
      balance_after: 500000,
      description: 'Оплата картой •• 4417',
      created_at: at(-2, 12),
    },
    {
      id: 'we1',
      type: 'booking_refund',
      amount: 150000,
      balance_after: 150000,
      description: 'Возврат · отмена брони Чегет',
      created_at: at(-20, 10),
    },
  ],
};

// --- chat ---

export type MockMessage = {
  id: number;
  trip_id: string;
  type: MessageType;
  sender_id: string | null;
  body: string;
  created_at: string;
};

let messageSeq = 1000;
export const nextMessageId = () => ++messageSeq;

export const messages: MockMessage[] = [];

function say(trip_id: string, sender_id: string | null, body: string, minutesAgo: number) {
  messages.push({
    id: nextMessageId(),
    trip_id,
    type: sender_id ? 'text' : 'system',
    sender_id,
    body,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  });
}

const FILLER = [
  'Кто едет на переднем сиденье?',
  'Я возьму термос с чаем',
  'Сколько стоит канатка в этом сезоне?',
  'Около 2 500, но может подняться',
  'Отлично, жду выезда!',
  'Кто-нибудь брал прокат на месте?',
];
const talkers = ['u_daria', 'u_liza', 'u_artem', 'u_me'];
for (let i = 0; i < 56; i++) say('t1', talkers[i % 4]!, FILLER[i % FILLER.length]!, (60 - i) * 60);
say('t1', null, 'Лиза Сабанова присоединилась к выезду', 70);
say('t1', 'u_daria', 'Наверху обещают −8 и ветер. Берите шапки и перчатки', 50);
say('t1', 'u_liza', 'У меня есть запасные перчатки, если что', 40);
say('t1', 'u_me', 'Супер. Буду у вокзала в 05:50, место у окна моё', 30);
say('t3', 'u_azamat', 'Друзья, заселение в 11:00, ски-пасс берём на месте', 120);
say('t5', null, 'Лиза Сабанова присоединилась к выезду', 300);
say('t5', 'u_liza', 'Тимур, я с рюкзаком, багажник свободен?', 280);
say('t6', 'u_azamat', 'Посадка по QR, не забудьте открыть билеты', 30);
say('t7', 'u_me', 'Спасибо всем, было круто!', 60 * 24 * 12);

export const lastRead: Record<string, number> = { t1: messageSeq - 9, t3: messageSeq, t5: 0 };

// --- notifications ---

export const notifications = [
  {
    id: 'n1',
    type: 'trip_reminder',
    title: 'Завтра выезд',
    body: 'Попутка на Чегемские водопады, сбор в 08:00',
    data: { trip_id: 't5' },
    read_at: null as string | null,
    created_at: inHours(-1),
  },
  {
    id: 'n2',
    type: 'booking_confirmed',
    title: 'Бронь подтверждена',
    body: 'Эльбрус: Азау и Чегет — билет в профиле',
    data: { trip_id: 't1' },
    read_at: null as string | null,
    created_at: inHours(-30),
  },
  {
    id: 'n3',
    type: 'booking_refund',
    title: 'Деньги вернулись на кошелёк',
    body: '1 500 ₽ за отменённую бронь',
    data: null,
    read_at: at(-19, 10) as string | null,
    created_at: at(-20, 10),
  },
];
