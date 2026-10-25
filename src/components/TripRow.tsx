import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TripShort } from '@/api/types';
import { radius, size, space } from '@/theme';
import { formatTripDates } from '@/utils/format';
import { returnOrDeparture, seatsLabel, TRIP_TYPE_LABEL } from '@/utils/trip';

import { Card } from './Card';
import { MountainCover } from './MountainCover';
import { Text } from './Text';

type Props = {
  trip: TripShort;
  onPress: () => void;
  /** Вторая строка; по умолчанию — даты и формат. */
  subtitle?: string;
  /** Правый блок; по умолчанию — свободные места. */
  trailing?: ReactNode;
  muted?: boolean;
};

/** Строка выезда в списке: миниатюра, название, дата, свободные места. */
export function TripRow({ trip, onPress, subtitle, trailing, muted }: Props) {
  const sub =
    subtitle ??
    `${formatTripDates(trip.departure_at, returnOrDeparture(trip))} · ${TRIP_TYPE_LABEL[trip.type].toLowerCase()}`;
  return (
    <Card onPress={onPress} accessibilityLabel={`${trip.title}, ${sub}`} style={styles.card}>
      <MountainCover cover={trip.direction?.slug} variant="thumb" style={styles.thumb} />
      <View style={styles.text}>
        <Text variant="bodyStrong" color={muted ? 'muted' : 'ink'} numberOfLines={2}>
          {trip.title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {trailing ?? (
        <Text variant="captionStrong" color="muted">
          {seatsLabel(trip)}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  thumb: { width: size.thumb, height: size.thumb, borderRadius: radius.icon },
  text: { flex: 1, gap: space.xxs },
});
