import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import { BackHeader } from '@/features/profile/components/BackHeader';
import { colors, spacing } from '@/theme/tokens';

import { CommentsSheet } from '../components/CommentsSheet';
import { FeedPostItem } from '../components/FeedPostItem';
import { PostActionsSheet } from '../components/PostActionsSheet';
import { PostLikers } from '../components/PostLikers';
import { usePostScreen } from '../usePostScreen';

type Props = {
  postId: string;
  // Opened from a comment in "Novità": the comments sheet starts open, on that comment.
  openComments?: boolean;
  highlightCommentId?: string | null;
};

// One post on its own page (rightplace://post/<id>, "Novità"): the card, and for its author who liked it. Whether
// the post may be seen at all is decided by get_post; when it may not, it is the same as an expired one.
export function PostScreen({ postId, openComments = false, highlightCommentId = null }: Props) {
  const { t } = useTranslation('feed');
  const screen = usePostScreen(postId, openComments);
  const { post } = screen;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.back}>
        <BackHeader title={t('post.title')} fallback="/feed" />
      </View>
      {screen.isError ? <EmptyState message={t('post.loadError')} /> : null}
      {!screen.isError && !screen.isLoading && !post ? (
        <EmptyState message={t('post.unavailable')} />
      ) : null}
      {post ? (
        <ScrollView contentContainerStyle={styles.content}>
          <FeedPostItem
            post={post}
            photoUri={screen.photoUrls[post.id]}
            avatarUrls={screen.avatarUrls}
            onToggleLike={screen.toggleLike}
            onOpenComments={() => screen.setCommentsOpen(true)}
            onLongPress={screen.openActions}
            onOpenPhoto={screen.viewer.open}
            onOpenAuthor={screen.openAuthor}
          />
          {post.isMine ? (
            <PostLikers
              likers={screen.likers.data}
              failed={screen.likers.isError}
              avatarUrls={screen.avatarUrls}
              onOpenProfile={screen.openLiker}
            />
          ) : null}
        </ScrollView>
      ) : null}
      {screen.notice ? <Toast tone="success" message={t(`actions.${screen.notice}`)} /> : null}
      <PhotoViewer
        photos={screen.viewer.photos}
        index={screen.viewer.index}
        onClose={screen.viewer.close}
      />
      <CommentsSheet
        postId={screen.commentsOpen && post ? post.id : null}
        highlightId={highlightCommentId}
        onClose={() => screen.setCommentsOpen(false)}
      />
      <PostActionsSheet
        post={screen.actionsFor}
        onClose={() => screen.openActions(null)}
        onDone={screen.setNotice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { paddingHorizontal: spacing.xl },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xl },
});
