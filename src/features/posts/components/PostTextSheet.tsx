import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LinkedText } from '@/components/ui/LinkedText';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { postMetaText } from '../domain/postMeta';
import type { FeedPost } from '../domain/types';

type Props = { post: FeedPost | null; onClose: () => void };

// A text-only post has nothing to open full screen: its caption is read here, in full.
export function PostTextSheet({ post, onClose }: Props) {
  const { t } = useTranslation('feed');
  return (
    <Sheet visible={post !== null} onClose={onClose}>
      {post ? (
        <View style={styles.body}>
          <Text variant="body12" color="textSecondary">
            {postMetaText(t, post, new Date())}
          </Text>
          {/* The links sheet lives behind this Modal: a long press on a link would open it out of sight. */}
          <LinkedText
            testID="post-caption"
            text={post.caption ?? ''}
            variant="body15"
            onLinkLongPress={() => undefined}
          />
          <Button label={t('comments.close')} variant="ghost" onPress={onClose} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
