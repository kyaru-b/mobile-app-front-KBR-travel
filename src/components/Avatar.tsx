import { Image, StyleSheet, View } from 'react-native';

import type { UserShort } from '@/api/types';
import { avatarColors, color, radius, size as sizes, space, type TextVariant } from '@/theme';
import { initials } from '@/utils/format';
import { fullName } from '@/utils/trip';

import { Text } from './Text';

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length]!;
}

type Props = {
  user: Pick<UserShort, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
  size?: number;
};

/** Круг с фото или инициалами. */
export function Avatar({ user, size = sizes.avatar }: Props) {
  const box = { width: size, height: size, borderRadius: radius.pill };
  if (user.avatar_url) {
    return <Image source={{ uri: user.avatar_url }} style={box} accessibilityIgnoresInvertColors />;
  }
  const variant: TextVariant =
    size >= sizes.avatarLg ? 'h3' : size >= sizes.avatar ? 'captionStrong' : 'small';
  return (
    <View style={[styles.circle, box, { backgroundColor: colorFor(user.id) }]}>
      <Text variant={variant}>{initials(fullName(user))}</Text>
    </View>
  );
}

type StackProps = {
  users: UserShort[];
  max?: number;
  size?: number;
};

/** Круги с инициалами внахлёст. */
export function AvatarStack({ users, max = 3, size = sizes.avatarSm }: StackProps) {
  return (
    <View style={styles.stack} accessibilityElementsHidden>
      {users.slice(0, max).map((u, i) => (
        <View key={u.id} style={[styles.ring, i > 0 && styles.overlap]}>
          <Avatar user={u} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row' },
  ring: { borderRadius: radius.pill, borderWidth: sizes.border, borderColor: color.surface },
  overlap: { marginLeft: -space.sm },
});
