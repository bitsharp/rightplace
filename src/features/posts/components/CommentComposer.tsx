import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { QuickEmojiBar } from '@/components/ui/QuickEmojiBar';
import { Text } from '@/components/ui/Text';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import {
  clampCommentLength,
  commentLength,
  insertAtSelection,
  MAX_COMMENT_LENGTH,
  type Selection,
} from '../domain/quickEmojis';
import { useAddComment } from '../hooks';

export function CommentComposer({ postId }: { postId: string }) {
  const { t } = useTranslation('feed');
  const { t: tErrors } = useTranslation('errors');
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState<Selection | null>(null);
  // Controlled selection only right after an emoji, so the cursor lands behind it; any user move releases it.
  const [forced, setForced] = useState<Selection | undefined>(undefined);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const add = useAddComment(postId);
  const trimmed = text.trim();
  const errorCode = rpcErrorCodeOf(add.error);
  const send = () => add.mutate(trimmed, { onSuccess: () => setText('') });
  const change = (next: string) => {
    setText(clampCommentLength(next));
    setCursor(null);
  };
  const pickEmoji = (emoji: string) => {
    const next = insertAtSelection(text, cursor, emoji);
    if (commentLength(next.text) > MAX_COMMENT_LENGTH) return;
    const caret = { start: next.cursor, end: next.cursor };
    setText(next.text);
    setCursor(caret);
    setForced(caret);
    inputRef.current?.focus();
  };
  return (
    <View style={styles.box}>
      {errorCode ? (
        <Text variant="body13" color="error">
          {tErrors(`rpc.${errorCode}`)}
        </Text>
      ) : null}
      <QuickEmojiBar onPick={pickEmoji} />
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={t('comments.placeholder')}
          placeholder={t('comments.placeholder')}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          multiline
          value={text}
          selection={forced}
          onChangeText={change}
          onSelectionChange={(event) => {
            setCursor(event.nativeEvent.selection);
            setForced(undefined);
          }}
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
        {t('comments.counter', { count: commentLength(text), max: MAX_COMMENT_LENGTH })}
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
