import { create } from 'zustand';

import type { PaymentMode, TripType } from '@/api/types';

export type DraftProgramItem = { time: string; title: string };

export type TripDraft = {
  type: TripType;
  organizerId: string | null;
  directionId: string | null;
  title: string;
  /** trip_pickup_points: где садимся. */
  pickupTitle: string;
  pickupAddress: string;
  /** ISO, дата и время выезда вместе. */
  departureAt: string;
  returnTime: string;
  seats: number;
  vehicleId: string | null;
  paymentMode: PaymentMode;
  requiresConfirmation: boolean;
  /** Цена за место (тур) или доля бензина (попутка) в рублях, как вводит пользователь. */
  priceRub: string;
  program: DraftProgramItem[];
  tags: string[];
  included: string[];
  whatToBring: string[];
  freeCancelHours: number;
  lateRefundPercent: number;
  insurance: boolean;
  description: string;
};

function defaultDeparture(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(7, 30, 0, 0);
  return d.toISOString();
}

export const INCLUDED_OPTIONS = ['Трансфер', 'Гид', 'Канатка', 'Обед', 'Жильё'];
export const BRING_OPTIONS = ['Тёплая куртка', 'Паспорт', 'Очки', 'Вода'];
export const TAG_OPTIONS = ['ski', 'hiking', 'lakes'];
export const FREE_CANCEL_OPTIONS = [12, 24, 48, 72];
export const LATE_REFUND_OPTIONS = [0, 30, 50, 100];

const initialDraft = (): TripDraft => ({
  type: 'carpool',
  organizerId: null,
  directionId: null,
  title: '',
  pickupTitle: '',
  pickupAddress: '',
  departureAt: defaultDeparture(),
  returnTime: '20:00',
  seats: 3,
  vehicleId: null,
  paymentMode: 'offline',
  requiresConfirmation: true,
  priceRub: '',
  program: [{ time: '07:30', title: 'Выезд' }],
  tags: [],
  included: ['Трансфер'],
  whatToBring: ['Тёплая куртка'],
  freeCancelHours: 24,
  lateRefundPercent: 0,
  insurance: false,
  description: '',
});

type DraftState = {
  draft: TripDraft;
  update: (patch: Partial<TripDraft>) => void;
  reset: () => void;
};

/** Черновик «Собрать поездку»: не теряется при переходе между шагами и закрытии экрана. */
export const useTripDraft = create<DraftState>((set) => ({
  draft: initialDraft(),
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set({ draft: initialDraft() }),
}));
