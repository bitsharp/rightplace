import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { useAddComment } from '../hooks';

export const MAX_COMMENT_LENGTH = 300;

export function CommentComposer({ postId }: { postId: string }) {
  const { t } = useTranslation('feed');
  const { t: tErrors } = useTranslation('errors');
  const [text, setText] = useState('');
  const add = useAddComment(postId);
  const trimmed = text.trim();
  const errorCode = rpcErrorCodeOf(add.error);
  const send = () => add.mutate(trimmed, { onSuccess: () => setText('') });
  return (
    <View style={styles.box}>
      {errorCode ? (
        <Text variant="body13" color="error">
          {tErrors(`rpc.${errorCode}`)}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={t('comments.placeholder')}
          placeholder={t('comments.placeholder')}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          maxLength={MAX_COMMENT_LENGTH}
          multiline
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Button
          label={t('comments.send')}
          size="md"
          loading={add.isPending}
          disabled={trimmed === ''}
          onPress={send}
        />
      </View>
      <Text variant="body12" color="textSecondary">
        {t('comments.counter', { count: text.length, max: MAX_COMMENT_LENGTH })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    ...typography.body15,
    flex: 1,
    maxHeight: 96,
    minHeight: heights.buttonMedium,
    color: colors.text,
    borderRadius: radius.segmented,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
