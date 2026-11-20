import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { usePersonMeta } from '@/features/friends/usePersonMeta';
import { spacing } from '@/theme/tokens';

import { useAvatarEditor } from '../avatar/useAvatarEditor';
import type { ProfileSummary } from '../summary/api';
import { useShareUi } from '../useShareUi';
import { AvatarEditor, AvatarEditorNotice } from './AvatarEditor';
import { ProfileHeader } from './ProfileHeader';
import { ShareHandleButton } from './ShareHandleButton';

type Props = { handle: string; summary: ProfileSummary | null | undefined };

// My profile header: editable photo, my counters (the lists open from them), "Edit profile" and, if enabled, "Share".
export function MyProfileHeader({ handle, summary }: Props) {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const meta = usePersonMeta();
  const avatar = useAvatarEditor();
  const { showShareHandle } = useShareUi();
  return (
    <ProfileHeader
      handle={handle}
      meta={
        summary?.ageBand && summary.gender
          ? meta({ ageBand: summary.ageBand, gender: summary.gender })
          : null
      }
      avatar={<AvatarEditor handle={handle} editor={avatar} />}
      counters={{
        posts: summary?.postsCount ?? null,
        followers: summary?.followersCount ?? null,
        following: summary?.followingCount ?? null,
      }}
      onOpenFollowers={() => router.push('/profile/followers')}
      onOpenFollowing={() => router.push('/profile/following')}
    >
      <View style={styles.actions}>
        <Button
          label={t('header.edit')}
          variant="ghost"
          size="md"
          style={styles.action}
          onPress={() => router.push('/profile/edit')}
        />
        {showShareHandle ? <ShareHandleButton handle={handle} style={styles.action} /> : null}
      </View>
      <AvatarEditorNotice editor={avatar} />
    </ProfileHeader>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
