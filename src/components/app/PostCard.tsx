import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarIntent } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { confirmFeedback } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

import { PhotoFrame } from './PhotoFrame';

type Props = {
  handle: string;
  meta: string;
  tone: AvatarIntent;
  daysLeft: number;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  onToggleLike: () => void;
  caption?: string;
  photoUri?: string;
  scene?: number;
};

export function PostCard({
  handle,
  meta,
  tone,
  daysLeft,
  caption,
  photoUri,
  scene,
  ...social
}: Props) {
  const { t } = useTranslation('ui');
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar intent={tone} size={36} />
        <View style={styles.headerTexts}>
          <Text variant="body14Medium">{formatHandle(handle)}</Text>
          <Text variant="body12" color="textSecondary">
            {meta}
          </Text>
        </View>
        {/* Posts are deleted server-side after 7 days (CLAUDE.md principle 5). */}
        <MonoLabel>{t('post.expires', { count: daysLeft })}</MonoLabel>
      </View>
      <PhotoFrame height={210} uri={photoUri} scene={scene} accessibilityLabel={caption} />
      <View style={styles.footer}>
        {caption ? (
          <Text testID="post-caption" variant="body14">
            {caption}
          </Text>
        ) : null}
        <SocialActions {...social} />
      </View>
    </View>
  );
}

function SocialActions({
  likeCount,
  liked,
  commentCount,
  onToggleLike,
}: Pick<Props, 'likeCount' | 'liked' | 'commentCount' | 'onToggleLike'>) {
  const { t } = useTranslation('ui');
  const toggle = () => {
    confirmFeedback();
    onToggleLike();
  };
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('post.like')}
        accessibilityState={{ selected: liked }}
        hitSlop={12}
        onPress={toggle}
        style={styles.action}
      >
        <Icon name="heart" color={liked ? 'going' : 'textSecondary'} filled={liked} />
        <Text variant="body14Medium" color={liked ? 'going' : 'textSecondary'}>
          {String(likeCount)}
        </Text>
      </Pressable>
      <View style={styles.action}>
        <Icon name="chat" color="textSecondary" />
        <Text variant="body14" color="textSecondary">
          {String(commentCount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
  },
  headerTexts: { flex: 1, gap: 2 },
  footer: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.md,
    gap: spacing.sm + 2,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 24 },
});
