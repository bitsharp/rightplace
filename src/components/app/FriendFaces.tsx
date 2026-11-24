import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { colors, spacing } from '@/theme/tokens';

export type FriendFace = { userId: string; handle: string };

type Props = {
  // Accepted follows only: the server filters them (principle 6) and signs the photos (principle 1).
  friends: readonly FriendFace[];
  // Signed photo URLs by user id, one batch request per screen; missing = initial.
  urls: Record<string, string>;
  max?: number;
  size?: number;
  // A face's photo loaded or failed (see Avatar.onPhotoSettled): the map marker bitmap needs to know.
  onFaceSettled?: (userId: string) => void;
};

const OVERLAP = 8;

// How many faces a row or marker draws unless told otherwise: only these photos are ever requested.
export const DEFAULT_MAX_FACES = 2;

// A few overlapping faces plus "+N": the friends of one venue on the friends map, no numbers about strangers.
export function FriendFaces({
  friends,
  urls,
  max = DEFAULT_MAX_FACES,
  size = 28,
  onFaceSettled,
}: Props) {
  if (friends.length === 0) return null;
  const shown = friends.slice(0, max);
  const more = friends.length - shown.length;
  return (
    <View testID="friend-faces" style={styles.row}>
      {shown.map((friend, index) => (
        <View key={friend.userId} style={index > 0 ? { marginLeft: -OVERLAP } : undefined}>
          <Avatar
            intent={avatarIntent(friend.handle)}
            initial={friend.handle.charAt(0)}
            size={size}
            photo={avatarPhotoFor(urls, friend.userId)}
            onPhotoSettled={onFaceSettled ? () => onFaceSettled(friend.userId) : undefined}
          />
        </View>
      ))}
      {more > 0 ? (
        <Text variant="label10" color="textSecondary" style={styles.more}>
          {`+${more}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: { marginLeft: spacing.xs, color: colors.textSecondary },
});
