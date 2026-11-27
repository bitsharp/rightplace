import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { formatHandle } from '@/features/profile/domain/handle';
import { afterModalDismiss } from '@/lib/afterModalDismiss';
import { spacing } from '@/theme/tokens';

import { friendFacesOf, type FriendVenue } from '../domain/mapLayers';

type Props = {
  // null keeps the sheet closed.
  venue: FriendVenue | null;
  onClose: () => void;
  onOpenFriend: (handle: string) => void;
  onOpenVenue: (venueId: string) => void;
};

type Destination = { kind: 'friend'; handle: string } | { kind: 'venue'; venueId: string };

// The friends of one venue on the friends map (accepted follows only, principle 6), opened by tapping a marker
// that groups several of them. Photos follow principle 1: the server only signs the ones the viewer may see.
export function FriendsSheet({ venue, onClose, onOpenFriend, onOpenVenue }: Props) {
  // The profile or venue is another screen: on iOS it opens only once the sheet's Modal is gone.
  const deferred = useMemo(
    () =>
      afterModalDismiss<Destination>(Platform.OS, (destination) =>
        destination.kind === 'friend'
          ? onOpenFriend(destination.handle)
          : onOpenVenue(destination.venueId),
      ),
    [onOpenFriend, onOpenVenue],
  );
  const go = (destination: Destination) => {
    onClose();
    deferred.request(destination);
  };
  return (
    <Sheet visible={venue !== null} onClose={onClose} onDismiss={deferred.onDismiss}>
      {venue ? <FriendsList venue={venue} go={go} /> : null}
    </Sheet>
  );
}

function FriendsList({ venue, go }: { venue: FriendVenue; go: (to: Destination) => void }) {
  const { t } = useTranslation('map');
  const faces = friendFacesOf(venue.handles, venue.friendIds);
  const urls = useAvatarUrls(faces.map((face) => face.userId));
  const hidden = venue.count - faces.length;
  return (
    <View style={styles.list}>
      <Text variant="display22">{venue.name}</Text>
      {faces.map((face) => (
        <ProfileLink
          key={face.userId}
          handle={face.handle}
          onPress={() => go({ kind: 'friend', handle: face.handle })}
          style={styles.row}
        >
          <Avatar
            intent={avatarIntent(face.handle)}
            initial={face.handle.charAt(0)}
            size={40}
            photo={avatarPhotoFor(urls, face.userId)}
          />
          <Text variant="body15Strong">{formatHandle(face.handle)}</Text>
        </ProfileLink>
      ))}
      {hidden > 0 ? (
        <Text variant="body13" color="textSecondary">
          {t('friendsSheet.more', { count: hidden })}
        </Text>
      ) : null}
      <Button
        label={t('friendsSheet.openVenue')}
        variant="secondary"
        onPress={() => go({ kind: 'venue', venueId: venue.venueId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
