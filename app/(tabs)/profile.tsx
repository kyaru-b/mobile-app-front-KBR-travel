import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useMe, useMyBookings, useMyTrips, useUpdateMe } from '@/api/hooks';
import type { Booking } from '@/api/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  MenuList,
  Screen,
  Segmented,
  Skeleton,
  StateView,
  Text,
  TextField,
  TripRow,
} from '@/components';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { color, size, space } from '@/theme';
import {
  formatDayLong,
  formatPrice,
  formatRating,
  formatTime,
  maskPhone,
  pluralize,
} from '@/utils/format';
import { ACTIVE_BOOKING, BOOKING_STATUS, fullName, isPast } from '@/utils/trip';

type Tab = 'upcoming' | 'past';

const ROLE_LABEL: Record<string, string> = {
  owner: 'владелец',
  manager: 'менеджер',
  guide: 'гид',
  driver: 'водитель',
  checker: 'контролёр',
};

function ProfileHeader() {
  const me = useMe();
  const update = useUpdateMe();
  const [editing, setEditing] = useState<{ first: string; last: string } | null>(null);

  if (me.isPending) return <Skeleton height={size.avatarLg} />;
  if (me.isError) {
    return <StateView status="error" error={me.error} onRetry={() => void me.refetch()} />;
  }
  const user = me.data;

  if (editing) {
    const save = () =>
      editing.first.trim() &&
      update.mutate(
        { first_name: editing.first.trim(), last_name: editing.last.trim() || null },
        { onSuccess: () => setEditing(null), onError: (e) => toast(errorMessage(e)) },
      );
    return (
      <View style={styles.edit}>
        <TextField
          label="Имя"
          value={editing.first}
          onChangeText={(first) => setEditing({ ...editing, first })}
          autoFocus
        />
        <TextField
          label="Фамилия"
          value={editing.last}
          onChangeText={(last) => setEditing({ ...editing, last })}
        />
        <View style={styles.row}>
          <Button
            title="Отмена"
            variant="soft"
            onPress={() => setEditing(null)}
            style={styles.grow}
          />
          <Button title="Сохранить" loading={update.isPending} onPress={save} style={styles.grow} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Avatar user={user} size={size.avatarLg} />
      <View style={styles.grow}>
        <Text variant="h3" numberOfLines={1}>
          {fullName(user)}
        </Text>
        <Text variant="small" color="muted">
          {maskPhone(user.phone)}
          {user.city ? ` · ${user.city}` : ''}
        </Text>
        <Text variant="small" color="muted">
          {user.rating !== null ? `★ ${formatRating(user.rating)} · ` : ''}
          {pluralize(user.trips_finished, ['поездка', 'поездки', 'поездок'])}
        </Text>
      </View>
      <IconButton
        icon="edit"
        accessibilityLabel="Изменить имя"
        onPress={() => setEditing({ first: user.first_name, last: user.last_name ?? '' })}
      />
    </View>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const status = BOOKING_STATUS[booking.status];
  return (
    <TripRow
      trip={booking.trip}
      muted={!ACTIVE_BOOKING.includes(booking.status) && booking.status !== 'completed'}
      subtitle={`${booking.code} · ${formatDayLong(booking.trip.departure_at)}, ${formatTime(booking.trip.departure_at)}`}
      trailing={<Badge label={status.label} tone={status.tone} />}
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
    />
  );
}

function TeamCard() {
  const me = useMe();
  const memberships = me.data?.organizers ?? [];
  if (memberships.length === 0) return null;
  return (
    <View style={styles.gapSm}>
      <Text variant="title">Команда организатора</Text>
      {memberships.map((m) => (
        <Card key={m.organizer.id} style={styles.gapSm}>
          <View style={styles.row}>
            <Avatar
              user={{ id: m.organizer.id, first_name: m.organizer.display_name, last_name: null }}
            />
            <View style={styles.grow}>
              <Text variant="bodyStrong">{m.organizer.display_name}</Text>
              <Text variant="small" color="muted">
                {m.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}
              </Text>
            </View>
            {m.organizer.verified && <Badge label="Проверен" tone="success" />}
          </View>
          {m.permissions.includes('tickets.scan') && (
            <Button
              title="Сканировать билеты"
              variant="dark"
              onPress={() => router.push('/scan')}
            />
          )}
        </Card>
      ))}
    </View>
  );
}

function MyTrips() {
  const trips = useMyTrips();
  const list = (trips.data ?? []).filter((t) => !isPast(t));
  if (list.length === 0) return null;
  return (
    <View style={styles.gapSm}>
      <Text variant="title">Мои выезды</Text>
      {list.map((t) => (
        <TripRow
          key={t.id}
          trip={t}
          trailing={
            <Text variant="captionStrong" color="muted">
              {t.seats_taken}/{t.seats_total}
            </Text>
          }
          onPress={() => router.push({ pathname: '/trip/[id]', params: { id: t.id } })}
        />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const bookings = useMyBookings();
  const me = useMe();
  const trips = useMyTrips();
  const signOut = useAuth((s) => s.signOut);

  const all = bookings.data ?? [];
  const upcoming = all.filter((b) => ACTIVE_BOOKING.includes(b.status) && !isPast(b.trip));
  const past = all.filter((b) => !upcoming.includes(b));
  const shown = tab === 'upcoming' ? upcoming : past;

  const confirmSignOut = () =>
    Alert.alert('Выйти из аккаунта?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void signOut() },
    ]);

  let list;
  if (bookings.isPending) {
    list = (
      <StateView
        status="loading"
        skeleton={[0, 1].map((i) => (
          <Skeleton key={i} height={size.thumb + space.xxl} />
        ))}
      />
    );
  } else if (bookings.isError) {
    list = (
      <StateView status="error" error={bookings.error} onRetry={() => void bookings.refetch()} />
    );
  } else if (shown.length === 0) {
    list = (
      <StateView
        status="empty"
        title={tab === 'upcoming' ? 'Броней пока нет' : 'Прошедших поездок нет'}
        text={tab === 'upcoming' ? 'Выберите выезд на Главной' : undefined}
        action={
          tab === 'upcoming'
            ? { title: 'Найти выезд', onPress: () => router.navigate('/') }
            : undefined
        }
      />
    );
  } else {
    list = (
      <View style={styles.gapSm}>
        {shown.map((b) => (
          <BookingRow key={b.id} booking={b} />
        ))}
      </View>
    );
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={bookings.isRefetching || me.isRefetching || trips.isRefetching}
          onRefresh={() => {
            void bookings.refetch();
            void me.refetch();
            void trips.refetch();
          }}
          tintColor={color.muted}
        />
      }
      contentStyle={styles.content}
    >
      <ProfileHeader />

      <Card
        onPress={() => router.push('/wallet')}
        accessibilityLabel="Кошелёк"
        style={styles.wallet}
      >
        <Icon name="wallet" color="accent" />
        <View style={styles.grow}>
          <Text variant="small" color="muted">
            Кошелёк
          </Text>
          <Text variant="title">{formatPrice(me.data?.wallet_balance ?? 0)}</Text>
        </View>
        <Icon name="chevron" color="muted" size={size.iconSm + space.xxs} />
      </Card>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: `Мои брони · ${upcoming.length}` },
          { value: 'past', label: `История · ${past.length}` },
        ]}
      />
      {list}

      <MyTrips />
      <TeamCard />

      <MenuList
        items={[
          { label: 'Уведомления', icon: 'bell', onPress: () => router.push('/notifications') },
          {
            label: 'Стать организатором',
            icon: 'shield',
            onPress: () =>
              toast('Туры продают только ИП и самозанятые — заявку можно будет подать здесь'),
          },
          {
            label: 'Помощь и поддержка',
            icon: 'chat',
            onPress: () => toast('Поддержка появится скоро'),
          },
          { label: 'Выйти', icon: 'close', onPress: confirmSignOut },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.xxl, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  edit: { gap: space.md },
  grow: { flex: 1 },
  gapSm: { gap: space.sm },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
