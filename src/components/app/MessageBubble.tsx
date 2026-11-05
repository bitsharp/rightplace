import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { PhotoFrame } from './PhotoFrame';

type Content =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; caption?: string; uri?: string; scene?: number };

type Props = {
  author: 'me' | 'other';
  content: Content;
  senderName?: string;
  // Only for my own messages while they are being sent (optimistic) or when sending failed.
  status?: 'sending' | 'failed';
  onRetry?: () => void;
  // Long press opens the moderation actions (report / block).
  onLongPress?: () => void;
};

export function MessageBubble({
  author,
  content,
  senderName,
  status,
  onRetry,
  onLongPress,
}: Props) {
  const { t } = useTranslation('ui');
  const mine = author === 'me';
  return (
    <View testID="bubble-wrap" style={[styles.wrap, mine ? styles.mine : styles.theirs]}>
      {!mine && senderName ? (
        <Text variant="body12" color="maybe">
          {senderName}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole={status === 'failed' ? 'button' : undefined}
        onPress={status === 'failed' ? onRetry : undefined}
        onLongPress={onLongPress}
        style={mine ? styles.mine : undefined}
      >
        {content.kind === 'text' ? (
          <TextBubble mine={mine} text={content.text} />
        ) : (
          <PhotoBubble mine={mine} {...content} />
        )}
      </Pressable>
      {status ? (
        <Text variant="label10" color={status === 'failed' ? 'error' : 'textSecondary'}>
          {t(`chat.${status === 'failed' ? 'failed' : 'sending'}`)}
        </Text>
      ) : null}
    </View>
  );
}

function TextBubble({ mine, text }: { mine: boolean; text: string }) {
  return (
    <View testID="bubble" style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text variant={mine ? 'body15Strong' : 'body15'} color={mine ? 'onAccent' : 'text'}>
        {text}
      </Text>
    </View>
  );
}

function PhotoBubble({
  mine,
  caption,
  uri,
  scene,
}: {
  mine: boolean;
  caption?: string;
  uri?: string;
  scene?: number;
}) {
  const { t } = useTranslation('ui');
  return (
    <>
      <View style={[styles.frame, { borderColor: mine ? colors.going : colors.border }]}>
        <PhotoFrame height={150} uri={uri} scene={scene} accessibilityLabel={caption} />
        {caption ? (
          <Text variant="body14" style={styles.caption}>
            {caption}
          </Text>
        ) : null}
      </View>
      {mine ? <MonoLabel>{t('chat.followersOnly')}</MonoLabel> : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', gap: spacing.xs },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  bubble: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.card,
  },
  bubbleMine: { backgroundColor: colors.going, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  frame: {
    width: 230,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  caption: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
});
