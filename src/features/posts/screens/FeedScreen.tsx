import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { colors, spacing } from '@/theme/tokens';

import { CommentsSheet } from '../components/CommentsSheet';
import { FeedPostItem } from '../components/FeedPostItem';
import { PostActionsSheet } from '../components/PostActionsSheet';
import { useFeedScreen } from '../useFeedScreen';
import { useTopBar } from '../useTopBar';

export function FeedScreen() {
  const { t } = useTranslation('feed');
  const topBar = useTopBar();
  const screen = useFeedScreen();
  const { feed } = screen;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <FlatList
        data={feed.posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<FeedHeader />}
        ListEmptyComponent={<FeedEmpty loading={feed.isLoading} failed={feed.isError} />}
        ListFooterComponent={<FollowMore onPress={screen.followMore} />}
        refreshControl={<RefreshControl refreshing={feed.isRefreshing} onRefresh={feed.refresh} />}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
          <FeedPostItem
            post={item}
            photoUri={screen.photoUrls[item.id]}
            onToggleLike={screen.toggleLike}
            onOpenComments={screen.openComments}
            onLongPress={screen.openActions}
          />
        )}
      />
      {screen.notice ? <Toast tone="success" message={t(`actions.${screen.notice}`)} /> : null}
      <CommentsSheet postId={screen.commentsFor} onClose={() => screen.openComments(null)} />
      <PostActionsSheet
        post={screen.actionsFor}
        onClose={() => screen.openActions(null)}
        onDone={screen.setNotice}
      />
    </SafeAreaView>
  );
}

function FeedHeader() {
  const { t } = useTranslation('feed');
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" variant="display17">
        {t('title')}
      </Text>
      <Card style={styles.banner}>
        <Icon name="eye" size={18} color="textSecondary" />
        <Text variant="body13" color="textSecondary" style={styles.bannerText}>
          {t('banner')}
        </Text>
      </Card>
    </View>
  );
}

function FeedEmpty({ loading, failed }: { loading: boolean; failed: boolean }) {
  const { t } = useTranslation('feed');
  if (loading) return null;
  if (failed) return <EmptyState message={t('loadError')} />;
  return (
    <Card tone="dashed" style={styles.empty}>
      <Text variant="body15Strong">{t('empty.title')}</Text>
      <Text variant="body13" color="textSecondary">
        {t('empty.body')}
      </Text>
    </Card>
  );
}

function FollowMore({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('feed');
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.followMore}>
      <Text variant="body14" color="maybe">
        {t('followMore')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md + 2 },
  header: { gap: spacing.md, paddingBottom: spacing.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  bannerText: { flex: 1 },
  empty: { gap: spacing.xs },
  followMore: { alignItems: 'center', paddingVertical: spacing.md, minHeight: 44 },
});
