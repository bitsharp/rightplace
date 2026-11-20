import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FollowStateButton, type FollowAction } from '@/components/app/FriendRow';
import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { formatHandle } from '@/features/profile/domain/handle';
import type { ProfileSummary } from '@/features/profile/summary/api';
import { spacing } from '@/theme/tokens';

import type { SearchResult } from '../api';
import { avatarIntent } from '../domain/avatarColor';
import { usePersonMeta } from '../usePersonMeta';

type Props = {
  person: SearchResult;
  summary: ProfileSummary | null | undefined;
  avatarPhoto?: AvatarPhoto;
  onAction: (userId: string, action: FollowAction) => void;
  onMore: () => void;
};

// Public identity (handle, age band, gender) for everyone; counters only if the server released them (accepted
// follow) and never as links: the lists of other people are not mine to open.
export function PublicProfileHeader({ person, summary, avatarPhoto, onAction, onMore }: Props) {
  const { t } = useTranslation('friends');
  const meta = usePersonMeta();
  return (
    <ProfileHeader
      handle={person.handle}
      meta={meta(person)}
      avatar={
        <Avatar
          intent={avatarIntent(person.handle)}
          initial={formatHandle(person.handle).charAt(1)}
          size={86}
          photo={avatarPhoto}
        />
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
        />
        <Button label={t('publicProfile.more')} variant="ghost" size="md" onPress={onMore} />
      </View>
    </ProfileHeader>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
