import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FollowStateButton, type FollowAction } from '@/components/app/FriendRow';
import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { EnlargeablePhoto } from '@/features/profile/components/EnlargeablePhoto';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { TourAnchor } from '@/features/tour/components/TourAnchor';
import { formatHandle } from '@/features/profile/domain/handle';
import type { ProfileSummary } from '@/features/profile/summary/api';
import { colors, heights, spacing } from '@/theme/tokens';

import type { SearchResult } from '../api';
import { avatarIntent } from '../domain/avatarColor';
import { usePersonMeta } from '../usePersonMeta';

type Props = {
  person: SearchResult;
  summary: ProfileSummary | null | undefined;
  avatarPhoto?: AvatarPhoto;
  onAction: (userId: string, action: FollowAction) => void;
  onMore: () => void;
  // Only for people linked to me by an accepted follow; absent = no button.
  onMessage?: () => void;
};

// Public identity (handle, age band, gender) for everyone; counters only if the server released them (accepted
// follow) and never as links: the lists of other people are not mine to open.
export function PublicProfileHeader({
  person,
  summary,
  avatarPhoto,
  onAction,
  onMore,
  onMessage,
}: Props) {
  const { t } = useTranslation('friends');
  const { t: tDm } = useTranslation('dm');
  const meta = usePersonMeta();
  return (
    <ProfileHeader
      handle={person.handle}
      meta={meta(person)}
      avatar={
        <EnlargeablePhoto photo={avatarPhoto} size={86}>
          <Avatar
            intent={avatarIntent(person.handle)}
            initial={formatHandle(person.handle).charAt(1)}
            size={86}
            photo={avatarPhoto}
          />
        </EnlargeablePhoto>
      }
      counters={{
        posts: summary?.postsCount ?? null,
        followers: summary?.followersCount ?? null,
        following: summary?.followingCount ?? null,
      }}
    >
      <View style={styles.actions}>
        <FollowStateButton
          handle={person.handle}
          followState={person.followState}
          followsMe={person.followsMe}
          onAction={(action) => onAction(person.userId, action)}
          layout="fill"
        />
        {onMessage ? (
          <TourAnchor id="profile.message" testID="message-slot" style={styles.mainAnchor}>
            <Button
              label={tDm('profile.message')}
              variant="secondary"
              size="md"
              style={styles.main}
              onPress={onMessage}
            />
          </TourAnchor>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('publicProfile.more')}
          onPress={onMore}
          style={styles.more}
        >
          <Text variant="body16Strong" accessible={false}>
            {'\u22EF'}
          </Text>
        </Pressable>
      </View>
    </ProfileHeader>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mainAnchor: { flex: 1, minWidth: 0 },
  main: { paddingHorizontal: spacing.md },
  more: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: heights.minTapTarget / 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
