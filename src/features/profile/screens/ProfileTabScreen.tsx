import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/useSession';
import { PostGrid } from '@/features/posts/components/PostGrid';
import { ProfileGridOverlays } from '@/features/posts/components/ProfileGridOverlays';
import { useProfileGrid } from '@/features/posts/useProfileGrid';
import { useTopBar } from '@/features/posts/useTopBar';
import { colors } from '@/theme/tokens';

import { MyProfileHeader } from '../components/MyProfileHeader';
import { useProfileSummary } from '../summary/hooks';

// Schermata 13, Instagram style: the top bar, my header (photo, counters, buttons) and under it the grid of my
// active posts (the day-after posts live 7 days). Everything that used to be the form is behind "Edit profile".
export function ProfileTabScreen() {
  const { t } = useTranslation('profile');
  const { profile, userId } = useSession();
  const topBar = useTopBar();
  const summary = useProfileSummary(userId);
  const grid = useProfileGrid(userId ?? '');
  if (!profile) return null;

  const { posts } = grid;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <PostGrid
        posts={posts.posts}
        photoUrls={grid.photoUrls}
        header={<MyProfileHeader handle={profile.handle} summary={summary.data} />}
        empty={
          <EmptyState
            message={
              posts.isError ? t('posts.loadError') : posts.isLoading ? '' : t('posts.emptyMine')
            }
          />
        }
        onOpenPost={grid.openPost}
        onLongPressPost={grid.openActions}
        onLoadMore={posts.loadMore}
        refreshing={posts.isRefreshing}
        onRefresh={() => void Promise.all([posts.refresh(), summary.refetch()])}
      />
      <ProfileGridOverlays grid={grid} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background } });
