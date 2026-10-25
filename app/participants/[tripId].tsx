import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useDecideBooking, useTrip, useTripBookings } from '@/api/hooks';
import type { TripBooking } from '@/api/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Header,
  Screen,
  Skeleton,
  StateView,
  Text,
} from '@/components';
import { toast } from '@/store/toast';
import { color, size, space } from '@/theme';
import { formatPrice, maskPhone, pluralize } from '@/utils/format';
import { BOOKING_STATUS, fullName } from '@/utils/trip';

function ParticipantRow({
  booking,
  canDecide,
  onDecide,
  deciding,
}: {
  booking: TripBooking;
  canDecide: boolean;
  onDecide: (accept: boolean) => void;
  deciding: boolean;
}) {
  const status = BOOKING_STATUS[booking.status];
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar user={booking.user} />
        <View style={styles.grow}>
          <Text variant="bodyStrong">{fullName(booking.user)}</Text>
          <Text variant="small" color="muted">
            {maskPhone(booking.user.phone)} · {booking.code}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text variant="caption" color="muted">
        {pluralize(booking.seats_count, ['место', 'места', 'мест'])}
        {booking.guests.length ? ` · с ним: ${booking.guests.join(', ')}` : ''} ·{' '}
        {booking.paid_at ? `оплачено ${formatPrice(booking.total_amount)}` : 'оплата на месте'} ·
        сели {booking.tickets_used} из {booking.seats_count}
      </Text>
      {canDecide && booking.status === 'pending' && (
        <View style={styles.row}>
          <Button
            title="Отклонить"
            variant="soft"
            disabled={deciding}
            onPress={() => onDecide(false)}
            style={styles.grow}
          />
          <Button
            title="Подтвердить"
            loading={deciding}
            onPress={() => onDecide(true)}
            style={styles.grow}
          />
        </View>
      )}
    </Card>
  );
}

export default function ParticipantsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useTrip(tripId);
  const list = useTripBookings(tripId);
  const decide = useDecideBooking(tripId);
  const t = trip.data;
  const canDecide = !!t?.permissions.manage;
  const visible = (list.data ?? []).filter(
    (b) => !['cancelled_by_user', 'cancelled_by_organizer'].includes(b.status),
  );
  const seated = visible.reduce((n, b) => n + b.tickets_used, 0);

  const header = (
    <View style={styles.header}>
      <Header
        right={
          t?.permissions.scan ? (
            <Button
              title="Сканер"
              variant="dark"
              onPress={() => router.push('/scan')}
              style={styles.headerButton}
            />
          ) : undefined
        }
      />
      <Text variant="h1">Участники</Text>
      {t && (
        <Text variant="caption" color="muted">
          {t.title} · занято {t.seats_taken} из {t.seats_total} · сели {seated}
        </Text>
      )}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={visible}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ParticipantRow
            booking={item}
            canDecide={canDecide}
            deciding={decide.isPending && decide.variables?.bookingId === item.id}
            onDecide={(accept) =>
              decide.mutate(
                { bookingId: item.id, accept },
                {
                  onSuccess: () => toast(accept ? 'Бронь подтверждена' : 'Бронь отклонена'),
                  onError: (e) => toast(errorMessage(e)),
                },
              )
            }
          />
        )}
        ListEmptyComponent={
          list.isPending ? (
            <StateView
              status="loading"
              skeleton={[0, 1, 2].map((i) => (
                <Skeleton key={i} height={size.thumb * 2} />
              ))}
            />
          ) : list.isError ? (
            <StateView status="error" error={list.error} onRetry={() => void list.refetch()} />
          ) : (
            <StateView status="empty" title="Пока никто не записался" />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={color.muted}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.screen, paddingBottom: space.xxl, gap: space.sm },
  header: { gap: space.xs, paddingBottom: space.md },
  headerButton: { height: size.touch, paddingHorizontal: space.lg },
  card: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
});
