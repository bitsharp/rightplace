import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FriendFaces } from '@/components/app/FriendFaces';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { VenueCoverImage } from '@/components/app/VenueCoverImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { ShareHandleButton } from '@/features/profile/components/ShareHandleButton';
import { formatHandle } from '@/features/profile/domain/handle';
import type { VenueKind } from '@/features/venues/domain/venueList';

import type { VenueFriend } from '../api';
import type { OpenStatus } from '../domain/openingHours';
import type { TransportLink } from '../domain/transport';
import { faceOf } from './FriendsGoing';
import { OpenStatusLine } from './OpenStatusLine';

// Everything "La tua serata" adds around the declaration: the venue page already loaded all of it.
export type NightContext = {
  photoUrl: string | null;
  kind: VenueKind;
  address: string | null;
  status: OpenStatus | null;
  links: readonly TransportLink[];
  onOpenLink: (link: TransportLink) => void;
  // Accepted follows only, as the server returned them; the count is theirs, not an anonymous aggregate.
  friends: readonly VenueFriend[];
  urls: Record<string, string>;
  // My own @tag, for the invite button when nobody I follow is going yet; null while the profile loads.
  myHandle: string | null;
  onOpenFriend: (handle: string) => void;
};

const PHOTO_SIZE = 72;
const FACE_SIZE = 40;
const MAX_FACES = 7;

type CardProps = {
  name: string;
  photoUrl: string | null;
  kind: VenueKind;
  address: string | null;
  status: OpenStatus | null;
  onPress: () => void;
};

export function NightVenueCard({ name, photoUrl, kind, address, status, onPress }: CardProps) {
  const { t } = useTranslation('venue');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('yourNight.openVenue')}
      onPress={onPress}
      style={styles.card}
    >
      <VenueCoverImage url={photoUrl} kind={kind} style={styles.photo} />
      <View style={styles.texts}>
        <Text variant="body15Strong" numberOfLines={1}>
          {name}
        </Text>
        <OpenStatusLine status={status} />
        {address ? (
          <Text variant="body12" color="textSecondary" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

type TransportProps = { links: readonly TransportLink[]; onOpen: (link: TransportLink) => void };

// Only the service and its existing deep link: no estimated minutes, nothing we cannot know.
export function NightTransport({ links, onOpen }: TransportProps) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('transport.title')}</Text>
      <View style={styles.tiles}>
        {links.map((link) => (
          <Pressable
            key={link.provider}
            accessibilityRole="link"
            onPress={() => onOpen(link)}
            style={styles.tile}
          >
            <Text variant="body14">{t(`yourNight.transport.${link.provider}`)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type NightFriendsProps = {
  friends: readonly VenueFriend[];
  urls: Record<string, string>;
  myHandle: string | null;
  onOpenFriend: (handle: string) => void;
};

// Accepted follows only (principle 6); photos as the server signed them (principle 1).
export function NightFriends({ friends, urls, myHandle, onOpenFriend }: NightFriendsProps) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('yourNight.friends', { count: friends.length })}</Text>
      {friends.length === 0 ? (
        <>
          <EmptyState message={t('yourNight.friendsEmpty')} />
          {myHandle ? <ShareHandleButton handle={myHandle} /> : null}
        </>
      ) : null}
      <FriendFaces
        friends={friends.map(faceOf)}
        urls={urls}
        max={MAX_FACES}
        size={FACE_SIZE}
        onPressFace={onOpenFriend}
      />
      {friends.map((friend) => (
        <ProfileLink
          key={friend.handle}
          handle={friend.handle}
          onPress={() => onOpenFriend(friend.handle)}
        >
          <Text variant="body15Strong">{formatHandle(friend.handle)}</Text>
        </ProfileLink>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.goingBorder,
    backgroundColor: colors.surface,
  },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.button },
  placeholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.button,
    backgroundColor: colors.goingSoft,
  },
  texts: { flex: 1, minWidth: 0, gap: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
