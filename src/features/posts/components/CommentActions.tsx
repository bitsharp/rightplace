import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { PostComment } from '../domain/types';
import { useDeleteComment, useReportComment } from '../hooks';

export type CommentNotice = 'reported' | 'deleted';

type Props = {
  comment: PostComment;
  postId: string;
  onBack: () => void;
  onDone: (notice: CommentNotice) => void;
};

// Moderation on a long press (principle 7): others' comments can be reported; mine, or those on my
// post, can be deleted. The server enforces who may delete; the buttons only mirror `canDelete`.
export function CommentActions({ comment, postId, onBack, onDone }: Props) {
  const { t } = useTranslation('feed');
  const report = useReportComment();
  const remove = useDeleteComment(postId);
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {t('actions.commentTitle', { handle: formatHandle(comment.handle) })}
      </Text>
      {comment.isMine ? null : (
        <Button
          label={t('actions.reportComment')}
          variant="ghost"
          loading={report.isPending}
          onPress={() => report.mutate(comment.id, { onSuccess: () => onDone('reported') })}
        />
      )}
      {comment.canDelete ? (
        <Button
          label={t('actions.deleteComment')}
          variant="ghost"
          loading={remove.isPending}
          onPress={() => remove.mutate(comment.id, { onSuccess: () => onDone('deleted') })}
        />
      ) : null}
      <Button label={t('actions.cancel')} variant="ghost" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
