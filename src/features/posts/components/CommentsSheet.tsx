import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { PostComment } from '../domain/types';
import { useComments } from '../hooks';
import { CommentActions, type CommentNotice } from './CommentActions';
import { CommentComposer } from './CommentComposer';

const NOTICE_MS = 3000;

type Props = { postId: string | null; onClose: () => void };

export function CommentsSheet({ postId, onClose }: Props) {
  return (
    <Sheet visible={postId !== null} onClose={onClose}>
      {postId ? <CommentsBody key={postId} postId={postId} onClose={onClose} /> : null}
    </Sheet>
  );
}

// One Modal only: the long-press actions replace the list inside the same sheet (a second Modal
// opened over a closing one is unreliable on iOS).
function CommentsBody({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { t } = useTranslation('feed');
  const [selected, setSelected] = useState<PostComment | null>(null);
  const [notice, setNotice] = useState<CommentNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (selected) {
    return (
      <CommentActions
        comment={selected}
        postId={postId}
        onBack={() => setSelected(null)}
        onDone={(done) => {
          setSelected(null);
          setNotice(done);
        }}
      />
    );
  }
  return (
    <View style={styles.body}>
      <View style={styles.header}>
        <Text accessibilityRole="header" variant="display17">
          {t('comments.title')}
        </Text>
        <Button label={t('comments.close')} variant="ghost" size="md" onPress={onClose} />
      </View>
      <CommentList postId={postId} onSelect={setSelected} />
      {notice ? <Toast tone="success" message={t(`actions.${notice}`)} /> : null}
      <CommentComposer postId={postId} />
    </View>
  );
}

function CommentList({
  postId,
  onSelect,
}: {
  postId: string;
  onSelect: (comment: PostComment) => void;
}) {
  const { t } = useTranslation('feed');
  const { comments, isLoading, isError, hasOlder, loadOlder } = useComments(postId);
  if (isError) return <Text color="textSecondary">{t('comments.loadError')}</Text>;
  if (!isLoading && comments.length === 0) {
    return <Text color="textSecondary">{t('comments.empty')}</Text>;
  }
  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      {hasOlder ? (
        <Button label={t('comments.older')} variant="ghost" size="md" onPress={loadOlder} />
      ) : null}
      {comments.map((comment) => (
        <Pressable
          key={comment.id}
          accessibilityHint={t('comments.hint')}
          onLongPress={() => onSelect(comment)}
          style={styles.comment}
        >
          <Text variant="body13Medium" color="textSecondary">
            {formatHandle(comment.handle)}
          </Text>
          <Text testID="comment-text" variant="body14">
            {comment.text}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { maxHeight: 320 },
  listContent: { gap: spacing.md },
  comment: { gap: 2 },
});
