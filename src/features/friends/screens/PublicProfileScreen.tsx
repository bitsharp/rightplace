import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { PostGrid } from '@/features/posts/components/PostGrid';
import { ProfileGridOverlays } from '@/features/posts/components/ProfileGridOverlays';
import { useProfileGrid } from '@/features/posts/useProfileGrid';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { BackHeader } from '@/features/profile/components/BackHeader';
import { isProfileOpen } from '@/features/profile/summary/profileOpen';
import { useProfileSummary } from '@/features/profile/summary/hooks';
import { colors, spacing } from '@/theme/tokens';

import type { SearchResult } from '../api';
import { PersonSheet } from '../components/PersonSheet';
import { PrivateProfileCard } from '../components/PrivateProfileCard';
import { PublicProfileHeader } from '../components/PublicProfileHeader';
import { usePublicProfile } from '../hooks';
import { useFollowActions } from '../useFollowActions';

// Landing page of rightplace://u/<handle>, laid out like the profile tab. Strangers (and pending requests) get the
// public identity and a lock; counters and posts open only with an accepted follow, and the server decides.
export function PublicProfileScreen({ handle }: { handle: string }) {
  const { t } = useTranslation('friends');
  const profile = usePublicProfile(handle);
  const actions = useFollowActions();
  const person = profile.data;
  const summary = useProfileSummary(person?.userId);
  const open = summary.data ? isProfileOpen(summary.data) : false;
  const grid = useProfileGrid(person?.userId ?? '', open);
  const avatars = useAvatarUrls([person?.userId]);
  const [moderating, setModerating] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.back}>
        <BackHeader title={t('publicProfile.title')} fallback="/friends" />
      </View>
      {person === null ? <NotFound /> : null}
      {person ? (
        <PostGrid
          posts={open ? grid.posts.posts : []}
          photoUrls={grid.photoUrls}
          header={
            <PublicProfileHeader
              person={person}
              summary={summary.data}
              avatarPhoto={avatarPhotoFor(avatars, person.userId)}
              onAction={actions.run}
              onMore={() => setModerating(true)}
            />
          }
          empty={<GridEmpty person={person} open={open} failed={grid.posts.isError} />}
          onOpenPost={grid.openPost}
          onLongPressPost={grid.openActions}
          onLoadMore={grid.posts.loadMore}
        />
      ) : null}
      <ProfileGridOverlays grid={grid} />
      <PersonSheet
        person={moderating ? (person ?? null) : null}
        onClose={() => setModerating(false)}
        onDone={() => setModerating(false)}
      />
    </SafeAreaView>
  );
}

type GridEmptyProps = { person: SearchResult; open: boolean; failed: boolean };

// Under the header: the lock for a closed profile, an empty state for an open one with nothing to show.
function GridEmpty({ person, open, failed }: GridEmptyProps) {
  const { t } = useTranslation('friends');
  if (!open) return <PrivateProfileCard handle={person.handle} followState={person.followState} />;
  return <EmptyState message={failed ? t('publicProfile.loadError') : t('publicProfile.empty')} />;
}

function NotFound() {
  const { t } = useTranslation('friends');
  return (
    <View style={styles.notFound}>
      <EmptyState message={t('publicProfile.notFound')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { paddingHorizontal: spacing.xl },
  notFound: { paddingHorizontal: spacing.xl },
});
