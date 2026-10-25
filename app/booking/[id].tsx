import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { errorMessage } from '@/api/errors';
import { useBooking, useCancelBooking, useMe, usePayBooking, useReview } from '@/api/hooks';
import type { BookingDetails, Ticket } from '@/api/types';
import {
  Badge,
  Button,
  Card,
  Header,
  Icon,
  Screen,
  Skeleton,
  StarRating,
  StateView,
  Text,
  TextField,
  TripRow,
} from '@/components';
import { toast } from '@/store/toast';
import { color, opacity, radius, size, space } from '@/theme';
import { formatDayLong, formatPrice, formatTime, pluralize } from '@/utils/format';
import { ACTIVE_BOOKING, BOOKING_STATUS } from '@/utils/trip';

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

function PaymentCard({ booking }: { booking: BookingDetails }) {
  const pay = usePayBooking(booking.id, booking.trip.id);
  const me = useMe();
  const left = useCountdown(booking.hold_expires_at);
  const balance = me.data?.wallet_balance ?? 0;
  const enough = balance >= booking.total_amount;

  const onPay = (method: 'card' | 'wallet') =>
    pay.mutate(method, {
      onSuccess: (b) =>
        toast(
          b.status === 'pending'
            ? 'Оплачено. Ждём подтверждения организатора'
            : 'Оплачено! Билеты ниже',
        ),
      onError: (e) => toast(errorMessage(e)),
    });

  return (
    <Card style={styles.gapMd}>
      <View style={styles.row}>
        <Icon name="clock" color="accent" />
        <Text variant="bodyStrong" style={styles.grow}>
          Места держим ещё {left}
        </Text>
      </View>
      <Text variant="h2">{formatPrice(booking.total_amount)}</Text>
      <Text variant="caption" color="muted">
        Деньги хранятся у платформы и уходят организатору только после скана билета на посадке.
        Отмена по правилам выезда — возврат на кошелёк.
      </Text>
      <Button title="Оплатить картой" loading={pay.isPending} onPress={() => onPay('card')} />
      <Button
        title={`С кошелька · ${formatPrice(balance)}`}
        variant="dark"
        disabled={!enough || pay.isPending}
        onPress={() => onPay('wallet')}
      />
    </Card>
  );
}

const TICKET_STATUS: Record<Ticket['status'], string> = {
  active: 'Действует',
  used: 'Использован',
  settled: 'Рассчитан',
  cancelled: 'Отменён',
};

function TicketCard({ ticket, index, total }: { ticket: Ticket; index: number; total: number }) {
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - space.screen * 4, size.coverHero - space.xxl);
  const active = ticket.status === 'active';
  return (
    <Card style={[styles.ticket, !active && styles.ticketDone]}>
      <View style={styles.row}>
        <Text variant="overline" color="muted" style={styles.grow}>
          Место {index + 1} из {total}
        </Text>
        <Badge label={TICKET_STATUS[ticket.status]} tone={active ? 'success' : 'muted'} />
      </View>
      <Text variant="title">{ticket.holder_name ?? 'Участник'}</Text>
      <View style={[styles.qr, !active && styles.dim]}>
        <QRCode value={ticket.code} size={qrSize} color={color.ink} backgroundColor={color.white} />
      </View>
      <Text variant="small" color="muted" align="center">
        {active
          ? 'Покажите QR гиду или водителю на посадке'
          : ticket.scanned_at
            ? `Отсканирован ${formatDayLong(ticket.scanned_at)}, ${formatTime(ticket.scanned_at)}`
            : 'Билет недействителен'}
      </Text>
    </Card>
  );
}

function ReviewCard({ bookingId }: { bookingId: string }) {
  const review = useReview(bookingId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  return (
    <Card style={styles.gapMd}>
      <Text variant="title">Как прошла поездка?</Text>
      <StarRating value={rating} onChange={setRating} />
      <TextField
        label="Отзыв"
        placeholder="Что понравилось, что улучшить"
        multiline
        value={text}
        onChangeText={setText}
      />
      <Button
        title="Отправить отзыв"
        disabled={rating === 0}
        loading={review.isPending}
        onPress={() =>
          review.mutate(
            { rating, text: text.trim() || null },
            {
              onSuccess: () => toast('Спасибо за отзыв!'),
              onError: (e) => toast(errorMessage(e)),
            },
          )
        }
      />
    </Card>
  );
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useBooking(id);
  const cancel = useCancelBooking(query.data?.trip.id);
  const b = query.data;

  if (!b) {
    return (
      <Screen>
        <Header />
        {query.isPending ? (
          <StateView
            status="loading"
            skeleton={[0, 1].map((i) => (
              <Skeleton key={i} height={size.coverCard} />
            ))}
          />
        ) : (
          <StateView status="error" error={query.error} onRetry={() => void query.refetch()} />
        )}
      </Screen>
    );
  }

  const status = BOOKING_STATUS[b.status];
  const canCancel = ACTIVE_BOOKING.includes(b.status);
  const paid = b.paid_at !== null;

  const confirmCancel = () => {
    const refund = paid
      ? b.refund_preview === b.total_amount - b.refunded_amount
        ? `Вернём всю сумму — ${formatPrice(b.refund_preview)} на кошелёк.`
        : `Бесплатная отмена закончилась ${formatDayLong(b.free_cancel_until)}. Вернём ${formatPrice(b.refund_preview)} на кошелёк.`
      : 'Место освободится для других участников.';
    Alert.alert('Отменить бронь?', refund, [
      { text: 'Оставить', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: () =>
          cancel.mutate(b.id, {
            onSuccess: (r) =>
              toast(
                r.refunded > 0
                  ? `Бронь отменена, ${formatPrice(r.refunded)} на кошельке`
                  : 'Бронь отменена',
              ),
            onError: (e) => toast(errorMessage(e)),
          }),
      },
    ]);
  };

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={color.muted}
        />
      }
      contentStyle={styles.content}
    >
      <Header
        right={
          b.status === 'confirmed' ? (
            <Button
              title="Чат группы"
              variant="soft"
              onPress={() =>
                router.push({ pathname: '/chat/[tripId]', params: { tripId: b.trip.id } })
              }
              style={styles.headerButton}
            />
          ) : undefined
        }
      />
      <View style={styles.title}>
        <Text variant="h1">Бронь {b.code}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <TripRow
        trip={b.trip}
        onPress={() => router.push({ pathname: '/trip/[id]', params: { id: b.trip.id } })}
      />

      {b.status === 'pending_payment' && <PaymentCard booking={b} />}

      {b.status === 'pending' && (
        <Card style={styles.note}>
          <Text variant="body">
            {paid
              ? 'Оплата прошла. Организатор подтвердит бронь — пришлём уведомление.'
              : 'Ждём, когда организатор подтвердит бронь. Оплата — на месте.'}
          </Text>
        </Card>
      )}
      {b.status === 'waitlisted' && (
        <Card style={styles.note}>
          <Text variant="body">
            Вы в листе ожидания. Если место освободится, придёт push — бронь нужно будет
            подтвердить.
          </Text>
        </Card>
      )}

      {b.tickets.length > 0 && (
        <View style={styles.gapMd}>
          <Text variant="title">{pluralize(b.tickets.length, ['Билет', 'Билета', 'Билетов'])}</Text>
          {b.tickets.map((t, i) => (
            <TicketCard key={t.id} ticket={t} index={i} total={b.tickets.length} />
          ))}
        </View>
      )}

      {b.status === 'completed' && !b.has_review && <ReviewCard bookingId={b.id} />}

      <Card style={styles.gapSm}>
        <Text variant="overline" color="muted">
          Детали
        </Text>
        <Detail label="Мест" value={String(b.seats_count)} />
        {b.pickup_point && (
          <Detail
            label="Посадка"
            value={`${b.pickup_point.title}, ${formatTime(b.pickup_point.pickup_at)}`}
          />
        )}
        <Detail
          label={b.trip.payment_mode === 'online' ? 'Сумма' : 'Оплата на месте'}
          value={formatPrice(b.total_amount)}
        />
        {paid && <Detail label="Оплачено" value={formatDayLong(b.paid_at!)} />}
        {b.refunded_amount > 0 && (
          <Detail label="Возвращено" value={formatPrice(b.refunded_amount)} />
        )}
      </Card>

      {canCancel && (
        <Button
          title={b.status === 'waitlisted' ? 'Выйти из листа ожидания' : 'Отменить бронь'}
          variant="soft"
          loading={cancel.isPending}
          onPress={confirmCancel}
        />
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="captionStrong" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  title: { gap: space.sm, alignItems: 'flex-start' },
  headerButton: { height: size.touch, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  gapSm: { gap: space.sm },
  gapMd: { gap: space.md },
  note: { backgroundColor: color.accentSoft },
  ticket: { gap: space.sm, alignItems: 'stretch' },
  ticketDone: { backgroundColor: color.track },
  qr: {
    alignSelf: 'center',
    padding: space.md,
    backgroundColor: color.white,
    borderRadius: radius.field,
  },
  dim: { opacity: opacity.disabled },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  detailValue: { flexShrink: 1, textAlign: 'right' },
});
