import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { FriendFaces } from '@/components/app/FriendFaces';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { heights, spacing } from '@/theme/tokens';

import type { VenueFriend } from '../api';

type Props = {
  friends: readonly VenueFriend[];
  // Signed photos by user id, one batch per screen; missing = initial (the server decides, principle 1).
  urls: Record<string, string>;
  // Opens the friends list (the existing tab): the venue page has no list of its own to grow.
  onSeeAll: () => void;
};

const MAX_FACES = 6;
const FACE_SIZE = 40;

// Id of a friend as the RPC gave it; a database not yet migrated omits it and the face keeps its initial.
export const faceOf = (friend: VenueFriend) => ({
  userId: friend.userId ?? friend.handle,
  handle: friend.handle,
});

// Accepted follows only (principle 6): the server filters, there is nothing to follow here.
export function FriendsGoing({ friends, urls, onSeeAll }: Props) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="display17">{t('friends.title')}</Text>
        {friends.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('friends.seeAll')}
            onPress={onSeeAll}
            style={styles.seeAll}
          >
            <Text variant="body13Medium" color="going">
              {t('friends.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <MonoLabel tone="going">{t('ui:friendsGoing', { count: friends.length })}</MonoLabel>
      {friends.length === 0 ? <EmptyState message={t('friends.empty')} /> : null}
      <FriendFaces friends={friends.map(faceOf)} urls={urls} max={MAX_FACES} size={FACE_SIZE} />
      {friends.map((friend) => (
        <FriendLine key={friend.handle} friend={friend} />
      ))}
    </View>
  );
}

// The faces above carry the photos; the lines say who is going and how sure (handle, band, intent).
function FriendLine({ friend }: { friend: VenueFriend }) {
  const { t } = useTranslation('venue');
  const age = friend.ageBand.replace('-', '–');
  const isGoing = friend.intent === 'going';
  return (
    <View style={rowStyles.row}>
      <View style={styles.texts}>
        <Text variant="body15Strong">{formatHandle(friend.handle)}</Text>
        <Text variant="body12" color="textSecondary">
          {t('friends.meta', { age, gender: t(`gender.${friend.gender}`) })}
        </Text>
      </View>
      <Text variant="label11" color={isGoing ? 'going' : 'maybe'}>
        {t(isGoing ? 'ui:intent.goingAction' : 'ui:intent.maybeAction')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { minHeight: heights.minTapTarget, justifyContent: 'center' },
  texts: { flex: 1, gap: 3 },
});
