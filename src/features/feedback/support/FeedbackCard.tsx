import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { Card } from '@/components/ui/Card';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, radius, spacing } from '@/theme/tokens';

import { ratingStars, type SupportInboxItem } from './domain/supportFeedback';

const THUMB_HEIGHT = 140;

type Props = { item: SupportInboxItem; onOpenScreenshot: (item: SupportInboxItem) => void };

// One feedback of the inbox: everything the user wrote, who (handle only), where and on which build.
export function FeedbackCard({ item, onOpenScreenshot }: Props) {
  const { t, i18n } = useTranslation('feedback');
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(item.createdAt));
  const device = [item.platform, item.appVersion].filter(Boolean).join(' · ');
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text variant="body15Strong" color="maybe">
          {ratingStars(item.rating)}
        </Text>
        <MonoLabel tone="muted">{when}</MonoLabel>
      </View>
      <Text variant="body14Medium">{formatHandle(item.authorHandle)}</Text>
      <Text variant="body12" color="textSecondary">
        {item.screen}
      </Text>
      <Text variant="body12" color="textSecondary">
        {device}
      </Text>
      <Text variant="body14">{item.comment === '' ? t('support.noComment') : item.comment}</Text>
      {item.screenshotUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('support.screenshotA11y')}
          onPress={() => onOpenScreenshot(item)}
          style={styles.thumb}
        >
          <PhotoFrame
            height={THUMB_HEIGHT}
            uri={item.screenshotUrl}
            cacheKey={item.id}
            contentFit="contain"
          />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  thumb: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});
