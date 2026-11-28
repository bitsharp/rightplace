import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { PhotoFrame } from '@/components/app/PhotoFrame';
import { PostSocialActions } from '@/components/app/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { LinkedText } from '@/components/ui/LinkedText';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { Text } from '@/components/ui/Text';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, heights, spacing } from '@/theme/tokens';

import { CommentsSheet } from '../components/CommentsSheet';
import { postMetaText } from '../domain/postMeta';
import type { FeedPost } from '../domain/types';
import { useStoryViewer } from '../useStoryViewer';

// Full-screen stories: today's posts of one person, swiped sideways. Same visibility rules as the
// feed (the server decides what get_story_posts returns).
export function StoryViewerScreen({ userId }: { userId: string }) {
  const { t } = useTranslation('feed');
  const viewer = useStoryViewer(userId);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // A tap opens just that photo, zoomable; swiping between stories stays the page list below.
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const zoomed = viewer.posts.find((post) => post.id === zoomedId);
  return (
    // A fullScreenModal draws under the status bar and the home indicator: insets are applied here.
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <StoryHeader
        top={insets.top}
        first={viewer.posts[0]}
        avatarUrls={viewer.avatarUrls}
        onClose={viewer.close}
        onOpenAuthor={viewer.openAuthor}
      />
      {viewer.posts.length === 0 && !viewer.isLoading ? (
        <Text color="textSecondary" style={styles.empty}>
          {t('story.empty')}
        </Text>
      ) : null}
      <FlatList
        horizontal
        pagingEnabled
        data={viewer.posts}
        keyExtractor={(post) => post.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <StoryPage
            post={item}
            width={width}
            position={index + 1}
            total={viewer.posts.length}
            photoUri={viewer.photoUrls[item.id]}
            onToggleLike={viewer.toggleLike}
            onOpenComments={viewer.openComments}
            onOpenPhoto={item.hasPhoto ? () => setZoomedId(item.id) : undefined}
          />
        )}
      />
      <CommentsSheet postId={viewer.commentsFor} onClose={() => viewer.openComments(null)} />
      <PhotoViewer
        photos={
          zoomed ? [{ id: zoomed.id, uri: viewer.photoUrls[zoomed.id], cacheKey: zoomed.id }] : []
        }
        index={zoomed ? 0 : null}
        onClose={() => setZoomedId(null)}
      />
    </View>
  );
}

type HeaderProps = {
  top: number;
  first?: FeedPost;
  avatarUrls: Record<string, string>;
  onClose: () => void;
  onOpenAuthor: () => void;
};

function StoryHeader({ top, first, avatarUrls, onClose, onOpenAuthor }: HeaderProps) {
  const { t } = useTranslation('feed');
  const title =
    first && !first.isMine
      ? t('story.title', { handle: formatHandle(first.authorHandle) })
      : t('story.mine');
  return (
    <View testID="story-header" style={[styles.header, { paddingTop: top + spacing.sm }]}>
      {first ? (
        <ProfileLink handle={first.authorHandle} onPress={onOpenAuthor}>
          <Avatar
            intent={first.isMine ? 'neutral' : 'going'}
            size={36}
            initial={first.authorHandle.replace(/^@/, '').charAt(0)}
            photo={avatarPhotoFor(avatarUrls, first.authorId)}
          />
        </ProfileLink>
      ) : null}
      <StoryTitle first={first} title={title} onOpenAuthor={onOpenAuthor} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('story.close')}
        onPress={onClose}
        hitSlop={spacing.sm}
        style={styles.close}
      >
        <Icon name="close" />
      </Pressable>
    </View>
  );
}

type TitleProps = { first?: FeedPost; title: string; onOpenAuthor: () => void };

function StoryTitle({ first, title, onOpenAuthor }: TitleProps) {
  const text = (
    <Text accessibilityRole="header" variant="display17" numberOfLines={1} ellipsizeMode="tail">
      {title}
    </Text>
  );
  if (!first) return <View style={styles.title}>{text}</View>;
  return (
    <ProfileLink handle={first.authorHandle} onPress={onOpenAuthor} style={styles.title}>
      {text}
    </ProfileLink>
  );
}

type PageProps = {
  post: FeedPost;
  width: number;
  position: number;
  total: number;
  photoUri?: string;
  onOpenPhoto?: () => void;
  onToggleLike: (post: FeedPost) => void;
  onOpenComments: (postId: string) => void;
};

function StoryPage({
  post,
  width,
  position,
  total,
  photoUri,
  onOpenPhoto,
  onToggleLike,
  onOpenComments,
}: PageProps) {
  const { t } = useTranslation('feed');
  const { t: tUi } = useTranslation('ui');
  return (
    <View style={[styles.page, { width }]}>
      <MonoLabel>{t('story.position', { current: position, total })}</MonoLabel>
      <Pressable
        disabled={!onOpenPhoto}
        accessibilityRole={onOpenPhoto ? 'button' : undefined}
        accessibilityLabel={onOpenPhoto ? tUi('photoViewer.open') : undefined}
        onPress={onOpenPhoto}
      >
        <PhotoFrame
          height={420}
          uri={photoUri}
          scene={post.id.charCodeAt(0)}
          accessibilityLabel={t('story.a11yPhoto', { handle: formatHandle(post.authorHandle) })}
          cacheKey={post.id}
        />
      </Pressable>
      {post.caption ? <LinkedText text={post.caption} variant="body16" /> : null}
      <Text variant="body13" color="textSecondary">
        {postMetaText(t, post, new Date())}
      </Text>
      <PostSocialActions
        likeCount={post.likeCount}
        liked={post.likedByMe}
        commentCount={post.commentCount}
        onToggleLike={() => onToggleLike(post)}
        onOpenComments={() => onOpenComments(post.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { flex: 1, minWidth: 0 },
  close: {
    flexShrink: 0,
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingHorizontal: spacing.xl },
  page: { paddingHorizontal: spacing.xl, gap: spacing.md },
});
