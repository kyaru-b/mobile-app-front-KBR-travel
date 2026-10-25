import { StyleSheet, View } from 'react-native';

import type { TripShort } from '@/api/types';
import { size, space } from '@/theme';
import { formatDayLong, formatRating, formatTime } from '@/utils/format';
import {
  durationLabel,
  freeSeats,
  hostName,
  priceCaption,
  priceLabel,
  seatsLeftLabel,
  TRIP_TYPE_LABEL,
  vehicleShortLabel,
} from '@/utils/trip';

import { AvatarStack } from './Avatar';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { MountainCover } from './MountainCover';
import { Text } from './Text';

const FEW_SEATS = 3;

type Props = {
  trip: TripShort;
  onPress: () => void;
};

/** Большая карточка выезда: обложка, бейджи, кто везёт, участники, цена. */
export function TripCard({ trip, onPress }: Props) {
  const free = freeSeats(trip);
  const host = trip.organizer ?? trip.driver;
  const details = [
    TRIP_TYPE_LABEL[trip.type],
    trip.vehicle && vehicleShortLabel(trip.vehicle),
    `выезд ${formatTime(trip.departure_at)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      padded={false}
      onPress={onPress}
      accessibilityLabel={`${trip.title}, ${formatDayLong(trip.departure_at)}`}
    >
      <MountainCover cover={trip.direction?.slug} variant="card" style={styles.cover}>
        <View style={styles.badges}>
          <Badge label={`${formatDayLong(trip.departure_at)} · ${durationLabel(trip)}`} />
          {free === 0 ? (
            <Badge label="Мест нет" tone="muted" />
          ) : (
            free <= FEW_SEATS && <Badge label={seatsLeftLabel(free)} tone="accent2" />
          )}
        </View>
      </MountainCover>
      <View style={styles.body}>
        <Text variant="h3" numberOfLines={2}>
          {trip.title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {details}
        </Text>
        {host && (
          <View style={styles.host}>
            <Text variant="captionStrong" numberOfLines={1} style={styles.shrink}>
              {hostName(trip)}
            </Text>
            {host.rating !== null && (
              <>
                <Icon name="star" size={size.iconSm - space.xs} />
                <Text variant="caption">{formatRating(host.rating)}</Text>
              </>
            )}
            {trip.organizer?.verified && <Badge label="Проверен" tone="success" />}
          </View>
        )}
        <View style={styles.footer}>
          <View style={styles.people}>
            <AvatarStack users={trip.participants_preview} />
            <Text variant="caption" color="muted">
              едут {trip.participants_count}
            </Text>
          </View>
          <View style={styles.price}>
            <Text variant="title">{priceLabel(trip)}</Text>
            <Text variant="small" color="muted">
              {priceCaption(trip)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: { height: size.coverCard },
  badges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
    padding: space.md,
  },
  body: { padding: space.lg, gap: space.xs },
  host: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  shrink: { flexShrink: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  people: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  price: { alignItems: 'flex-end' },
});
