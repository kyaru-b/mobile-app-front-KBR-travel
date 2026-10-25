import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { request, USE_MOCKS } from './client';
import { ApiError } from './errors';
import type {
  AuthTokens,
  Booking,
  BookingDetails,
  ChatPreview,
  CreateBookingBody,
  CreateTripBody,
  CreateVehicleBody,
  Direction,
  FeedFormat,
  Me,
  Message,
  Notification,
  Page,
  PayMethod,
  ScanResult,
  Season,
  Trip,
  TripBooking,
  TripShort,
  TripType,
  Vehicle,
  Wallet,
} from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx повторять бессмысленно, сетевые и 5xx — до двух раз.
      retry: (count, error) =>
        count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

export type FeedParams = {
  format?: FeedFormat;
  tag?: string;
  type?: TripType;
  q?: string;
  directionId?: string;
};

export const keys = {
  feed: (params: FeedParams) => ['trips', 'feed', params] as const,
  trip: (id: string) => ['trips', id] as const,
  tripBookings: (id: string) => ['trips', id, 'bookings'] as const,
  booking: (id: string) => ['bookings', id] as const,
  directions: (params: { season?: Season; q?: string }) => ['directions', params] as const,
  me: ['me'] as const,
  myBookings: ['me', 'bookings'] as const,
  myTrips: ['me', 'trips'] as const,
  myChats: ['me', 'chats'] as const,
  myVehicles: ['me', 'vehicles'] as const,
  wallet: ['me', 'wallet'] as const,
  messages: (tripId: string) => ['messages', tripId] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  scanCodes: ['mock', 'scan-codes'] as const,
};

// --- Авторизация ---

export function useSendSms() {
  return useMutation({
    mutationFn: (phone: string) =>
      request<void>('/auth/sms', { method: 'POST', body: { phone }, auth: false }),
  });
}

export function useVerifyCode() {
  return useMutation({
    // pd_consent — согласие на обработку ПДн (users.pd_consent_at, 152-ФЗ)
    mutationFn: (body: { phone: string; code: string }) =>
      request<AuthTokens>('/auth/verify', {
        method: 'POST',
        body: { ...body, pd_consent: true },
        auth: false,
      }),
  });
}

// --- Лента и выезды ---

const FEED_LIMIT = 20;

export function useTripsFeed(params: FeedParams) {
  return useInfiniteQuery({
    queryKey: keys.feed(params),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      request<Page<TripShort>>('/trips', {
        query: {
          format: params.format,
          tag: params.tag,
          type: params.type,
          q: params.q,
          direction_id: params.directionId,
          from: 'today',
          limit: FEED_LIMIT,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function useTrip(id: string) {
  return useQuery({ queryKey: keys.trip(id), queryFn: () => request<Trip>(`/trips/${id}`) });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTripBody) => request<Trip>('/trips', { method: 'POST', body }),
    onSuccess: (trip) => {
      qc.setQueryData(keys.trip(trip.id), trip);
      void qc.invalidateQueries({ queryKey: ['trips', 'feed'] });
      void qc.invalidateQueries({ queryKey: keys.myTrips });
    },
  });
}

export function useMyVehicles(enabled = true) {
  return useQuery({
    queryKey: keys.myVehicles,
    queryFn: () => request<Vehicle[]>('/me/vehicles'),
    enabled,
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVehicleBody) =>
      request<Vehicle>('/me/vehicles', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myVehicles }),
  });
}

// --- Брони ---

/** После любого изменения брони обновляем всё, где видны места, статусы и деньги. */
function useInvalidateBooking() {
  const qc = useQueryClient();
  return (tripId?: string) =>
    Promise.all([
      tripId && qc.invalidateQueries({ queryKey: keys.trip(tripId) }),
      qc.invalidateQueries({ queryKey: ['bookings'] }),
      qc.invalidateQueries({ queryKey: keys.myBookings }),
      qc.invalidateQueries({ queryKey: keys.myChats }),
      qc.invalidateQueries({ queryKey: keys.wallet }),
      qc.invalidateQueries({ queryKey: keys.me }),
      qc.invalidateQueries({ queryKey: ['trips', 'feed'] }),
    ]);
}

export function useBookTrip(tripId: string) {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: (body: CreateBookingBody) =>
      request<BookingDetails>(`/trips/${tripId}/bookings`, { method: 'POST', body }),
    onSettled: () => invalidate(tripId),
  });
}

export function useJoinWaitlist(tripId: string) {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: (seats: number) =>
      request<BookingDetails>(`/trips/${tripId}/waitlist`, {
        method: 'POST',
        body: { seats_count: seats },
      }),
    onSettled: () => invalidate(tripId),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: keys.booking(id),
    queryFn: () => request<BookingDetails>(`/bookings/${id}`),
  });
}

export function usePayBooking(bookingId: string, tripId?: string) {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: (method: PayMethod) =>
      request<BookingDetails>(`/bookings/${bookingId}/pay`, { method: 'POST', body: { method } }),
    onSettled: () => invalidate(tripId),
  });
}

export function useCancelBooking(tripId?: string) {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: (bookingId: string) =>
      request<{ refunded: number }>(`/bookings/${bookingId}`, { method: 'DELETE' }),
    onSettled: () => invalidate(tripId),
  });
}

export function useReview(bookingId: string) {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: (body: { rating: number; text: string | null }) =>
      request<BookingDetails>(`/bookings/${bookingId}/review`, { method: 'POST', body }),
    onSettled: () => invalidate(),
  });
}

// --- Организатор и водитель ---

export function useTripBookings(tripId: string) {
  return useQuery({
    queryKey: keys.tripBookings(tripId),
    queryFn: () => request<TripBooking[]>(`/trips/${tripId}/bookings`),
  });
}

export function useDecideBooking(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, accept }: { bookingId: string; accept: boolean }) =>
      request<void>(`/bookings/${bookingId}/${accept ? 'confirm' : 'decline'}`, { method: 'POST' }),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.tripBookings(tripId) }),
        qc.invalidateQueries({ queryKey: keys.trip(tripId) }),
      ]),
  });
}

export function useScanTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      request<ScanResult>('/tickets/scan', { method: 'POST', body: { code } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: keys.scanCodes });
    },
  });
}

/** Только в режиме моков: подсказка с кодами билетов для проверки сканера в эмуляторе. */
export function useMockScanCodes() {
  return useQuery({
    queryKey: keys.scanCodes,
    queryFn: () =>
      request<{ code: string; holder_name: string | null; trip_title: string }[]>(
        '/__mock/scan-codes',
      ),
    enabled: USE_MOCKS,
  });
}

export function useMyTrips() {
  return useQuery({ queryKey: keys.myTrips, queryFn: () => request<TripShort[]>('/me/trips') });
}

// --- Направления ---

export function useDirections(params: { season?: Season; q?: string }, enabled = true) {
  return useQuery({
    queryKey: keys.directions(params),
    queryFn: () => request<Direction[]>('/directions', { query: params }),
    enabled,
  });
}

// --- Профиль, кошелёк, уведомления ---

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => request<Me>('/me') });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<Me, 'first_name' | 'last_name' | 'city'>>) =>
      request<Me>('/me', { method: 'PATCH', body }),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export function useMyBookings() {
  return useQuery({ queryKey: keys.myBookings, queryFn: () => request<Booking[]>('/me/bookings') });
}

export function useMyChats() {
  return useQuery({ queryKey: keys.myChats, queryFn: () => request<ChatPreview[]>('/me/chats') });
}

export function useWallet() {
  return useQuery({ queryKey: keys.wallet, queryFn: () => request<Wallet>('/me/wallet') });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      request<Wallet>('/me/wallet/withdraw', { method: 'POST', body: { amount } }),
    onSuccess: (w) => {
      qc.setQueryData(keys.wallet, w);
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => request<Notification[]>('/notifications'),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: keys.unread,
    queryFn: () => request<{ count: number }>('/notifications/unread-count'),
    select: (d) => d.count,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request<void>('/notifications/read', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

// --- Чат ---

const MESSAGES_LIMIT = 50;

export function useMessages(tripId: string) {
  return useInfiniteQuery({
    queryKey: keys.messages(tripId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      request<Page<Message>>(`/trips/${tripId}/messages`, {
        query: { before: pageParam, limit: MESSAGES_LIMIT },
      }),
    getNextPageParam: (last) => last.next_cursor,
  });
}
