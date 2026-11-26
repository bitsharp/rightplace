import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarIntent, type AvatarPhoto } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { TourAnchor } from '@/features/tour/components/TourAnchor';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, heights, spacing } from '@/theme/tokens';

import { STORY_RING_SIZE, StoryAvatar } from './StoryAvatar';

// Wider than the ring so handles like "demo.milano2" stay readable before the ellipsis.
const STORY_WIDTH = STORY_RING_SIZE + 16;

export type Story = {
  id: string;
  handle: string;
  initial: string;
  tone: AvatarIntent;
  mine?: boolean;
  // Local only (see the seen-stories store): false = something new to watch.
  seen?: boolean;
  // Signed profile photo, only when I may see it; otherwise the initial.
  photo?: AvatarPhoto;
};

type Props = {
  handle: string;
  // My own signed photo (visible to me by definition); the initial otherwise.
  myPhoto?: AvatarPhoto;
  canPost: boolean;
  hasNews: boolean;
  stories: Story[];
  onPost: () => void;
  onOpenProfile: () => void;
  onOpenNews: () => void;
  onOpenFeedback: () => void;
  onOpenStory: (id: string) => void;
};

export function TopBar({
  handle,
  myPhoto,
  canPost,
  hasNews,
  stories,
  onPost,
  onOpenProfile,
  onOpenNews,
  onOpenFeedback,
  onOpenStory,
}: Props) {
  const { t } = useTranslation('ui');
  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.side, styles.left]}>
          {canPost ? <PostButton onPress={onPost} /> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('topBar.profile')}
          onPress={onOpenProfile}
          style={styles.handle}
        >
          <Avatar intent="neutral" initial={handle.charAt(0)} size={24} photo={myPhoto} />
          <Text variant="display17">{formatHandle(handle)}</Text>
          <Icon name="chevronDown" size={12} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.right}>
          <FeedbackButton onPress={onOpenFeedback} />
          <NewsButton hasNews={hasNews} onPress={onOpenNews} />
        </View>
      </View>
      <StoryStrip stories={stories} onOpenStory={onOpenStory} />
    </View>
  );
}

// Shown only after the user declared tonight's plan (TopBar.dc.html).
function PostButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('ui');
  return (
    <TourAnchor id="topbar.plus" style={styles.postAnchor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('topBar.post')}
        onPress={onPress}
        style={styles.post}
      >
        <Icon name="plus" size={22} color="onAccent" strokeWidth={2.4} />
      </Pressable>
    </TourAnchor>
  );
}

// Always visible, same size and tap target as the heart: feedback is about the page being looked at.
function FeedbackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topBar.feedback')}
      onPress={onPress}
      style={[styles.side, styles.feedback]}
    >
      <Icon name="feedback" size={26} />
    </Pressable>
  );
}

function NewsButton({ hasNews, onPress }: { hasNews: boolean; onPress: () => void }) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topBar.news')}
      onPress={onPress}
      style={[styles.side, styles.news]}
    >
      <Icon name="heart" size={26} />
      {hasNews ? <View testID="news-dot" style={styles.dot} /> : null}
    </Pressable>
  );
}

function StoryStrip({ stories, onOpenStory }: Pick<Props, 'stories' | 'onOpenStory'>) {
  const { t } = useTranslation('ui');
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stories}
    >
      {stories.map((story) => (
        <Pressable
          key={story.id}
          accessibilityRole="button"
          accessibilityLabel={
            story.mine
              ? t('topBar.myStoryA11y')
              : t('topBar.storyA11y', { handle: formatHandle(story.handle) })
          }
          onPress={() => onOpenStory(story.id)}
          style={styles.story}
        >
          <StoryAvatar
            initial={story.initial}
            tone={story.tone}
            seen={story.seen === true}
            photo={story.photo}
          />
          <Text
            variant="body11Medium"
            color="textSecondary"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.storyName}
          >
            {story.mine ? t('topBar.myStory') : story.handle.replace(/^@/, '')}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: heights.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  side: { width: heights.minTapTarget, height: heights.minTapTarget, justifyContent: 'center' },
  // As wide as the right group, so the handle stays centred.
  left: { width: heights.minTapTarget * 2 },
  right: { flexDirection: 'row', alignItems: 'center' },
  feedback: { alignItems: 'center' },
  news: { alignItems: 'flex-end' },
  postAnchor: { alignSelf: 'flex-start' },
  post: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: heights.minTapTarget },
  dot: {
    position: 'absolute',
    right: -1,
    top: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  stories: {
    gap: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.md,
  },
  story: { width: STORY_WIDTH, alignItems: 'center', gap: 5 },
  storyName: { width: STORY_WIDTH, textAlign: 'center' },
});
