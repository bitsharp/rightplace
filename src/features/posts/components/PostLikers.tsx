import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, radius, spacing } from '@/theme/tokens';

import type { PostLiker } from '../domain/types';

type Props = {
  likers: PostLiker[] | undefined;
  failed: boolean;
  // Signed profile photos by user id: only the ones the server lets me see; the rest keep the initial.
  avatarUrls: Record<string, string>;
  onOpenProfile: (handle: string) => void;
};

// "Piace a": shown to the author of the post only. Everyone in it can already see the post (accepted followers).
export function PostLikers({ likers, failed, avatarUrls, onOpenProfile }: Props) {
  const { t } = useTranslation('feed');
  return (
    <View testID="post-likers" style={styles.section}>
      <Text accessibilityRole="header" variant="display17">
        {t('post.likedBy')}
      </Text>
      {failed ? <Text color="textSecondary">{t('post.likersError')}</Text> : null}
      {!failed && likers?.length === 0 ? (
        <Text color="textSecondary">{t('post.noLikes')}</Text>
      ) : null}
      {likers?.map((liker) => (
        <View key={liker.userId} style={styles.row}>
          <ProfileLink handle={liker.handle} onPress={() => onOpenProfile(liker.handle)}>
            <Avatar
              intent={avatarIntent(liker.handle)}
              size={36}
              initial={liker.handle.replace(/^@/, '').charAt(0)}
              photo={avatarPhotoFor(avatarUrls, liker.userId)}
            />
          </ProfileLink>
          <ProfileLink
            handle={liker.handle}
            onPress={() => onOpenProfile(liker.handle)}
            style={styles.handle}
          >
            <Text variant="body15Strong">{formatHandle(liker.handle)}</Text>
          </ProfileLink>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  handle: { flex: 1 },
});
