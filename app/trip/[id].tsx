import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage, isApiError } from '@/api/errors';
import { useBookTrip, useJoinWaitlist, useTrip } from '@/api/hooks';
import type { Trip } from '@/api/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Footer,
  Header,
  Icon,
  IconButton,
  MountainCover,
  Screen,
  SeatsBar,
  Skeleton,
  StateView,
  Stepper,
  Text,
  TextField,
  type IconName,
} from '@/components';
import { toast } from '@/store/toast';
import { color, opacity, radius, size, space } from '@/theme';
import {
  formatDayLong,
  formatPrice,
  formatRating,
  formatTime,
  formatTripDates,
  isOneDay,
  pluralize,
} from '@/utils/format';
import {
  BOOKING_STATUS,
  durationLabel,
  freeSeats,
  fullName,
  priceCaption,
  priceLabel,
  returnOrDeparture,
  TAG_LABEL,
  TRIP_TYPE_LABEL,
  vehicleLabel,
} from '@/utils/trip';

const MAX_SEATS_PER_BOOKING = 10;

const openChat = (tripId: string) =>
  router.push({ pathname: '/chat/[tripId]', params: { tripId } });
const openBooking = (id: string) => router.push({ pathname: '/booking/[id]', params: { id } });

function tripWhen(trip: Trip): string {
  const end = returnOrDeparture(trip);
  const day = isOneDay(trip.departure_at, end)
    ? formatDayLong(trip.departure_at)
    : formatTripDates(trip.departure_at, end);
  return trip.return_at
    ? `${day} · ${formatTime(trip.departure_at)} – ${formatTime(trip.return_at)}`
    : `${day} · ${formatTime(trip.departure_at)}`;
}

function InfoRow({ icon, children }: { icon: IconName; children: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} color="muted" size={size.icon - space.xxs} />
      <Text variant="caption" style={styles.grow}>
        {children}
      </Text>
    </View>
  );
}

function HostCard({ trip }: { trip: Trip }) {
  if (trip.organizer) {
    const o = trip.organizer;
    return (
      <Card style={styles.host}>
        <Avatar user={{ id: o.id, first_name: o.display_name, last_name: null }} />
        <View style={styles.grow}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {o.display_name}
          </Text>
          <Text variant="small" color="muted">
            {o.legal_type === 'self_employed' ? 'Самозанятый' : 'ИП'}
            {o.experience_years
              ? ` · опыт ${pluralize(o.experience_years, ['год', 'года', 'лет'])}`
              : ''}
          </Text>
          {o.rating !== null && (
            <View style={styles.rating}>
              <Icon name="star" size={size.iconSm - space.xs} />
              <Text variant="small" color="muted">
                {formatRating(o.rating)} ·{' '}
                {pluralize(o.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}
              </Text>
            </View>
          )}
        </View>
        {o.verified && <Badge label="Проверен" tone="success" />}
      </Card>
    );
  }
  if (!trip.driver) return null;
  const d = trip.driver;
  return (
    <Card style={styles.host}>
      <Avatar user={d} />
      <View style={styles.grow}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {fullName(d)} · водитель
        </Text>
        <View style={styles.rating}>
          {d.rating !== null && <Icon name="star" size={size.iconSm - space.xs} />}
          <Text variant="small" color="muted">
            {d.rating !== null
              ? `${formatRating(d.rating)} · ${pluralize(d.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}`
              : 'пока без отзывов'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Шторка брони: сколько мест, точка сбора, имена гостей. */
function BookingSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const book = useBookTrip(trip.id);
  const max = Math.min(MAX_SEATS_PER_BOOKING, freeSeats(trip));
  const [seats, setSeats] = useState(1);
  const [pickup, setPickup] = useState(trip.pickup_points[0]?.id ?? null);
  const [guests, setGuests] = useState<string[]>([]);
  const total = trip.price * seats;
  const online = trip.payment_mode === 'online';

  const submit = () =>
    book.mutate(
      {
        seats_count: seats,
        pickup_point_id: pickup,
        guests: guests
          .slice(0, seats - 1)
          .map((g) => g.trim())
          .filter(Boolean),
      },
      {
        onSuccess: (b) => {
          onClose();
          openBooking(b.id);
        },
        onError: (e) => {
          toast(errorMessage(e));
          if (isApiError(e, 'seats_full')) onClose();
        },
      },
    );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <Text variant="h3">Бронь</Text>
        <Stepper
          label="Мест"
          hint={seats > 1 ? 'берёте друзей — впишите их имена' : `свободно ${freeSeats(trip)}`}
          value={seats}
          min={1}
          max={Math.max(1, max)}
          onChange={setSeats}
        />
        {Array.from({ length: seats - 1 }, (_, i) => (
          <TextField
            key={i}
            label={`Гость ${i + 1}`}
            placeholder="Имя и фамилия"
            value={guests[i] ?? ''}
            onChangeText={(v) =>
              setGuests((list) => {
                const next = [...list];
                next[i] = v;
                return next;
              })
            }
          />
        ))}
        {trip.pickup_points.length > 1 && (
          <View style={styles.gapSm}>
            <Text variant="captionStrong" color="muted">
              Где сядете
            </Text>
            <View style={styles.chips}>
              {trip.pickup_points.map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.title}, ${formatTime(p.pickup_at)}`}
                  active={pickup === p.id}
                  onPress={() => setPickup(p.id)}
                />
              ))}
            </View>
          </View>
        )}
        <Text variant="caption" color="muted">
          {online
            ? 'После брони у вас 15 минут на оплату. Деньги хранятся у платформы и уходят организатору только после скана билета на посадке.'
            : trip.requires_confirmation
              ? 'Оплата на месте. Бронь подтвердит организатор — пришлём уведомление.'
              : 'Оплата на месте. Билет появится сразу после брони.'}
        </Text>
        <Button
          title={online ? `Забронировать · ${formatPrice(total)}` : 'Забронировать'}
          loading={book.isPending}
          disabled={max === 0}
          onPress={submit}
        />
      </View>
    </Modal>
  );
}

function TripActions({ trip, onBook }: { trip: Trip; onBook: () => void }) {
  const waitlist = useJoinWaitlist(trip.id);
  const booking = trip.my_booking;
  const staff = trip.permissions.read_bookings || trip.permissions.scan;
  const canChat = staff || booking?.status === 'confirmed' || booking?.status === 'completed';
  // Момент открытия экрана; запись закрывается за час-два до выезда, точнее не нужно.
  const [openedAt] = useState(Date.now);
  const closed = new Date(trip.booking_closes_at).getTime() < openedAt;

  const joinWaitlist = () =>
    waitlist.mutate(1, {
      onSuccess: (b) => {
        toast('Вы в листе ожидания — напишем, если место освободится');
        openBooking(b.id);
      },
      onError: (e) => toast(errorMessage(e)),
    });

  let main;
  if (staff) {
    main = trip.permissions.scan ? (
      <Button title="Сканировать билеты" onPress={() => router.push('/scan')} style={styles.grow} />
    ) : (
      <Button
        title="Участники"
        onPress={() =>
          router.push({ pathname: '/participants/[tripId]', params: { tripId: trip.id } })
        }
        style={styles.grow}
      />
    );
  } else if (booking) {
    const status = BOOKING_STATUS[booking.status];
    main = (
      <Button
        title={
          booking.status === 'pending_payment'
            ? 'Оплатить бронь'
            : `${status.label} · ${booking.code}`
        }
        variant={booking.status === 'pending_payment' ? 'primary' : 'dark'}
        onPress={() => openBooking(booking.id)}
        style={styles.grow}
      />
    );
  } else if (closed) {
    main = (
      <Button
        title="Запись закрыта"
        variant="soft"
        disabled
        onPress={() => {}}
        style={styles.grow}
      />
    );
  } else if (freeSeats(trip) === 0) {
    main = (
      <Button
        title="Встать в лист ожидания"
        variant="dark"
        loading={waitlist.isPending}
        onPress={joinWaitlist}
        style={styles.grow}
      />
    );
  } else {
    main = <Button title="Забронировать место" onPress={onBook} style={styles.grow} />;
  }

  return (
    <Footer style={styles.footer}>
      <IconButton
        icon="chat"
        variant="soft"
        accessibilityLabel="Чат группы"
        style={[styles.chatButton, !canChat && styles.dimmed]}
        onPress={() =>
          canChat ? openChat(trip.id) : toast('Чат откроется после подтверждения брони')
        }
      />
      {main}
    </Footer>
  );
}

function TripSkeleton() {
  return (
    <StateView
      status="loading"
      skeleton={
        <>
          <Skeleton height={size.coverHero} rounded={0} />
          <View style={styles.content}>
            <Skeleton height={size.avatar + space.xxl} />
            <Skeleton height={size.coverCard + space.xxl} />
            <Skeleton height={size.coverTile} />
          </View>
        </>
      }
    />
  );
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const query = useTrip(id);
  const [sheet, setSheet] = useState(false);
  const trip = query.data;

  if (!trip) {
    return (
      <Screen padded={!query.isPending} edges={query.isPending ? [] : ['top']}>
        {query.isPending ? (
          <TripSkeleton />
        ) : (
          <>
            <Header />
            <StateView status="error" error={query.error} onRetry={() => void query.refetch()} />
          </>
        )}
      </Screen>
    );
  }

  const free = freeSeats(trip);
  const lastProgram = trip.program.length - 1;
  const freeCancelUntil = new Date(
    new Date(trip.departure_at).getTime() - trip.free_cancel_hours * 3_600_000,
  ).toISOString();
  const staff = trip.permissions.read_bookings || trip.permissions.scan;

  return (
    <Screen
      scroll
      padded={false}
      edges={[]}
      footer={<TripActions trip={trip} onBook={() => setSheet(true)} />}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={color.white}
          progressViewOffset={insets.top}
        />
      }
    >
      <MountainCover cover={trip.direction?.slug} variant="hero" style={styles.hero}>
        <View style={[styles.heroTop, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon="back" accessibilityLabel="Назад" onPress={() => router.back()} />
          <IconButton
            icon="heart"
            accessibilityLabel="В избранное"
            onPress={() => toast('Избранное появится в следующей версии')}
          />
        </View>
        <View style={styles.heroText}>
          <Text variant="overline" color="white" style={styles.heroDim}>
            {TRIP_TYPE_LABEL[trip.type]} · {durationLabel(trip)}
            {trip.direction ? ` · ${trip.direction.name}` : ''}
          </Text>
          <Text variant="h2" color="white">
            {trip.title}
          </Text>
          <Text variant="body" color="white" style={styles.heroDim}>
            {tripWhen(trip)}
          </Text>
        </View>
      </MountainCover>

      <View style={styles.content}>
        {trip.status === 'cancelled' && (
          <Card style={styles.cancelled}>
            <Text variant="bodyStrong" color="danger">
              Выезд отменён. Деньги за оплаченные брони вернулись на кошельки.
            </Text>
          </Card>
        )}

        <HostCard trip={trip} />

        {staff && (
          <Card style={styles.gapSm}>
            <Text variant="overline" color="muted">
              Для команды
            </Text>
            <View style={styles.pair}>
              <Button
                title="Участники"
                variant="soft"
                onPress={() =>
                  router.push({ pathname: '/participants/[tripId]', params: { tripId: trip.id } })
                }
                style={styles.grow}
              />
              {trip.permissions.scan && (
                <Button
                  title="Сканер"
                  variant="dark"
                  onPress={() => router.push('/scan')}
                  style={styles.grow}
                />
              )}
            </View>
          </Card>
        )}

        {trip.description ? (
          <Text variant="body" style={styles.description}>
            {trip.description}
          </Text>
        ) : null}

        {trip.program.length > 0 && (
          <Card style={styles.gapSm}>
            <Text variant="overline" color="muted">
              Программа
            </Text>
            {trip.program.map((p, i) => (
              <View key={`${p.title}-${i}`} style={styles.programRow}>
                <Text
                  variant="bodyStrong"
                  color={i === lastProgram ? 'accent' : 'ink'}
                  style={styles.time}
                >
                  {p.starts_at ?? '•'}
                </Text>
                <Text variant="body" style={styles.grow}>
                  {p.title}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {trip.pickup_points.length > 0 && (
          <Card style={styles.gapSm}>
            <Text variant="overline" color="muted">
              Где сбор
            </Text>
            {trip.pickup_points.map((p) => (
              <View key={p.id} style={styles.programRow}>
                <Text variant="bodyStrong" style={styles.time}>
                  {formatTime(p.pickup_at)}
                </Text>
                <View style={styles.grow}>
                  <Text variant="body">{p.title}</Text>
                  {p.address && (
                    <Text variant="small" color="muted">
                      {p.address}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.pair}>
          <Card style={[styles.grow, styles.gapSm]}>
            <Text variant="overline" color="muted">
              Места
            </Text>
            <SeatsBar total={trip.seats_total} taken={trip.seats_taken} />
            <Text variant="captionStrong">
              {free === 0 ? 'Мест нет' : `Свободно ${free} из ${trip.seats_total}`}
            </Text>
          </Card>
          <Card style={[styles.grow, styles.gapSm]}>
            <Text variant="overline" color="muted">
              {trip.type === 'carpool' ? 'Бензин' : 'Цена'}
            </Text>
            <Text variant="h3">{priceLabel(trip)}</Text>
            <Text variant="small" color="muted">
              {priceCaption(trip)}
              {trip.prepayment_amount > 0
                ? ` · предоплата ${formatPrice(trip.prepayment_amount)}`
                : ''}
            </Text>
          </Card>
        </View>

        {trip.vehicle && (
          <InfoRow icon="car">
            {`${vehicleLabel(trip.vehicle)}${trip.vehicle.color ? `, ${trip.vehicle.color}` : ''}`}
          </InfoRow>
        )}

        {(trip.included.length > 0 || trip.insurance_included || trip.tags.length > 0) && (
          <View style={styles.gapSm}>
            <Text variant="overline" color="muted">
              В цену входит
            </Text>
            <View style={styles.pills}>
              {trip.included.map((item) => (
                <Badge key={item} label={item} style={styles.pill} />
              ))}
              {trip.insurance_included && (
                <Badge label="Страховка" tone="success" style={styles.pill} />
              )}
              {trip.tags.map((t) => (
                <Badge key={t} label={TAG_LABEL[t] ?? t} tone="accent" style={styles.pill} />
              ))}
            </View>
          </View>
        )}

        {trip.what_to_bring.length > 0 && (
          <View style={styles.gapSm}>
            <Text variant="overline" color="muted">
              Что взять
            </Text>
            <View style={styles.pills}>
              {trip.what_to_bring.map((item) => (
                <Badge key={item} label={item} style={styles.pill} />
              ))}
            </View>
          </View>
        )}

        <Card style={styles.gapSm}>
          <Text variant="overline" color="muted">
            Условия
          </Text>
          <InfoRow icon="wallet">
            {trip.payment_mode === 'online'
              ? 'Оплата в приложении. Деньги у платформы до посадки по QR-билету.'
              : trip.type === 'carpool'
                ? 'Оплата водителю на месте, без комиссии.'
                : 'Оплата организатору напрямую.'}
          </InfoRow>
          <InfoRow icon="clock">
            {`Бесплатная отмена до ${formatDayLong(freeCancelUntil)}, ${formatTime(freeCancelUntil)}. Позже — возврат ${trip.late_cancel_refund_percent}%.`}
          </InfoRow>
          {trip.requires_confirmation && (
            <InfoRow icon="check">Бронь подтверждает организатор вручную.</InfoRow>
          )}
          <InfoRow icon="calendar">
            {`Запись до ${formatDayLong(trip.booking_closes_at)}, ${formatTime(trip.booking_closes_at)}`}
          </InfoRow>
          {trip.min_age !== null && <InfoRow icon="user">{`С ${trip.min_age} лет`}</InfoRow>}
        </Card>
      </View>

      {sheet && <BookingSheet trip={trip} onClose={() => setSheet(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: size.coverHero, justifyContent: 'space-between' },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
  },
  heroText: { padding: space.screen, gap: space.xs },
  heroDim: { opacity: opacity.muted },
  content: { padding: space.lg, gap: space.md },
  cancelled: { backgroundColor: color.dangerBg },
  host: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  description: { paddingHorizontal: space.xs },
  gapSm: { gap: space.sm },
  programRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.xxs },
  time: { minWidth: size.thumb },
  pair: { flexDirection: 'row', gap: space.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: { paddingVertical: space.sm, borderRadius: radius.icon },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  infoRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  grow: { flex: 1 },
  footer: { backgroundColor: color.surface },
  chatButton: { width: size.button, height: size.button, borderRadius: radius.field },
  dimmed: { opacity: opacity.disabled },
  backdrop: { flex: 1, backgroundColor: color.overlay },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    padding: space.screen,
    gap: space.md,
  },
});
