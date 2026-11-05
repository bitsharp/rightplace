import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, heights, spacing } from '@/theme/tokens';

import { postMetaText } from '../domain/postMeta';
import type { FeedPost } from '../domain/types';
import { useStoryViewer } from '../useStoryViewer';

// Full-screen stories: today's posts of one person, swiped sideways. Same visibility rules as the
// feed (the server decides what get_story_posts returns).
export function StoryViewerScreen({ userId }: { userId: string }) {
  const { t } = useTranslation('feed');
  const viewer = useStoryViewer(userId);
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <StoryHeader first={viewer.posts[0]} onClose={viewer.close} />
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
          />
        )}
      />
    </SafeAreaView>
  );
}

function StoryHeader({ first, onClose }: { first?: FeedPost; onClose: () => void }) {
  const { t } = useTranslation('feed');
  const title =
    first && !first.isMine
      ? t('story.title', { handle: formatHandle(first.authorHandle) })
      : t('story.mine');
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" variant="display17" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('story.close')}
        onPress={onClose}
        style={styles.close}
      >
        <Icon name="close" />
      </Pressable>
    </View>
  );
}

type PageProps = {
  post: FeedPost;
  width: number;
  position: number;
  total: number;
  photoUri?: string;
};

function StoryPage({ post, width, position, total, photoUri }: PageProps) {
  const { t } = useTranslation('feed');
  return (
    <View style={[styles.page, { width }]}>
      <MonoLabel>{t('story.position', { current: position, total })}</MonoLabel>
      <PhotoFrame
        height={420}
        uri={photoUri}
        scene={post.id.charCodeAt(0)}
        accessibilityLabel={t('story.a11yPhoto', { handle: formatHandle(post.authorHandle) })}
        cacheKey={post.id}
      />
      {post.caption ? <Text variant="body16">{post.caption}</Text> : null}
      <Text variant="body13" color="textSecondary">
        {postMetaText(t, post, new Date())}
      </Text>
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
    paddingVertical: spacing.md,
  },
  title: { flex: 1 },
  close: {
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
