import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FriendFaces } from '@/components/app/FriendFaces';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import type { VenueFriend } from '../api';
import type { OpenStatus } from '../domain/openingHours';
import type { TransportLink } from '../domain/transport';
import { faceOf } from './FriendsGoing';
import { OpenStatusLine } from './OpenStatusLine';

// Everything "La tua serata" adds around the declaration: the venue page already loaded all of it.
export type NightContext = {
  photoUrl: string | null;
  address: string | null;
  status: OpenStatus | null;
  links: readonly TransportLink[];
  onOpenLink: (link: TransportLink) => void;
  // Accepted follows only, as the server returned them; the count is theirs, not an anonymous aggregate.
  friends: readonly VenueFriend[];
  urls: Record<string, string>;
};

const PHOTO_SIZE = 72;
const FACE_SIZE = 40;
const MAX_FACES = 7;

type CardProps = {
  name: string;
  photoUrl: string | null;
  address: string | null;
  status: OpenStatus | null;
  onPress: () => void;
};

function Thumb({ url }: { url: string | null }) {
  const { t } = useTranslation('venue');
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <View testID="night-venue-placeholder" style={styles.placeholder} />;
  return (
    <Image
      accessible
      accessibilityLabel={t('cover.caption')}
      source={{ uri: url }}
      cachePolicy="memory-disk"
      contentFit="cover"
      onError={() => setFailed(true)}
      style={styles.photo}
    />
  );
}

export function NightVenueCard({ name, photoUrl, address, status, onPress }: CardProps) {
  const { t } = useTranslation('venue');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('yourNight.openVenue')}
      onPress={onPress}
      style={styles.card}
    >
      <Thumb url={photoUrl} />
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

export function NightFriends({
  friends,
  urls,
}: {
  friends: readonly VenueFriend[];
  urls: Record<string, string>;
}) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('yourNight.friends', { count: friends.length })}</Text>
      {friends.length === 0 ? <EmptyState message={t('friends.empty')} /> : null}
      <FriendFaces friends={friends.map(faceOf)} urls={urls} max={MAX_FACES} size={FACE_SIZE} />
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
