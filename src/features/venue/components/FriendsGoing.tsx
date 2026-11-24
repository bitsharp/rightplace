import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { VenueFriend } from '../api';

type Props = {
  friends: readonly VenueFriend[];
  // Signed photos by user id, one batch per screen; missing = initial (the server decides, principle 1).
  urls: Record<string, string>;
};

// Accepted follows only (principle 6): the server filters, there is nothing to follow here.
export function FriendsGoing({ friends, urls }: Props) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="display17">{t('friends.title')}</Text>
        <MonoLabel tone="going">{t('ui:friendsGoing', { count: friends.length })}</MonoLabel>
      </View>
      {friends.length === 0 ? <EmptyState message={t('friends.empty')} /> : null}
      {friends.map((friend) => (
        <FriendLine key={friend.handle} friend={friend} urls={urls} />
      ))}
    </View>
  );
}

function FriendLine({ friend, urls }: { friend: VenueFriend; urls: Props['urls'] }) {
  const { t } = useTranslation('venue');
  const handle = formatHandle(friend.handle);
  const age = friend.ageBand.replace('-', '–');
  const isGoing = friend.intent === 'going';
  return (
    <View style={rowStyles.row}>
      <Avatar
        intent={friend.intent}
        initial={handle.charAt(1)}
        photo={avatarPhotoFor(urls, friend.userId)}
      />
      <View style={styles.texts}>
        <Text variant="body15Strong">{handle}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  texts: { flex: 1, gap: 3 },
});
