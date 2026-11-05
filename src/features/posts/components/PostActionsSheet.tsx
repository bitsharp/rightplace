import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { FeedPost } from '../domain/types';
import { useBlockPostAuthor, useDeletePost, useReportPost } from '../hooks';

export type PostNotice = 'reported' | 'blocked' | 'deleted';

type Props = {
  post: FeedPost | null;
  onClose: () => void;
  onDone: (notice: PostNotice) => void;
};

type Step = 'menu' | 'confirmBlock' | 'confirmDelete';

// Moderation entry point on a long press (principle 7): report goes straight through, block and
// delete ask for confirmation.
export function PostActionsSheet({ post, onClose, onDone }: Props) {
  return (
    <Sheet visible={post !== null} onClose={onClose}>
      {post ? <Actions key={post.id} post={post} onClose={onClose} onDone={onDone} /> : null}
    </Sheet>
  );
}

function Actions({ post, onClose, onDone }: Props & { post: FeedPost }) {
  const [step, setStep] = useState<Step>('menu');
  const finish = (notice: PostNotice) => {
    onClose();
    onDone(notice);
  };
  if (step === 'confirmBlock')
    return <ConfirmBlock post={post} onClose={onClose} onDone={finish} />;
  if (step === 'confirmDelete')
    return <ConfirmDelete post={post} onClose={onClose} onDone={finish} />;
  return <Menu post={post} onClose={onClose} onStep={setStep} onDone={finish} />;
}

type MenuProps = {
  post: FeedPost;
  onClose: () => void;
  onStep: (step: Step) => void;
  onDone: (notice: PostNotice) => void;
};

function Menu({ post, onClose, onStep, onDone }: MenuProps) {
  const { t } = useTranslation('feed');
  const report = useReportPost();
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {t('actions.postTitle', { handle: formatHandle(post.authorHandle) })}
      </Text>
      {post.isMine ? (
        <Button
          label={t('actions.deletePost')}
          variant="ghost"
          onPress={() => onStep('confirmDelete')}
        />
      ) : (
        <>
          <Button
            label={t('actions.reportPost')}
            variant="ghost"
            loading={report.isPending}
            onPress={() => report.mutate(post.id, { onSuccess: () => onDone('reported') })}
          />
          <Button
            label={t('actions.block')}
            variant="ghost"
            onPress={() => onStep('confirmBlock')}
          />
        </>
      )}
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

type ConfirmProps = { post: FeedPost; onClose: () => void; onDone: (notice: PostNotice) => void };

function ConfirmBlock({ post, onClose, onDone }: ConfirmProps) {
  const { t } = useTranslation('feed');
  const block = useBlockPostAuthor();
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {t('actions.blockTitle', { handle: formatHandle(post.authorHandle) })}
      </Text>
      <Text color="textSecondary">{t('actions.blockBody')}</Text>
      <Button
        label={t('actions.blockConfirm')}
        variant="danger"
        loading={block.isPending}
        onPress={() => block.mutate(post.authorId, { onSuccess: () => onDone('blocked') })}
      />
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

function ConfirmDelete({ post, onClose, onDone }: ConfirmProps) {
  const { t } = useTranslation('feed');
  const remove = useDeletePost();
  return (
    <View style={styles.body}>
      <Text variant="display17">{t('actions.deleteTitle')}</Text>
      <Text color="textSecondary">{t('actions.deleteBody')}</Text>
      <Button
        label={t('actions.deleteConfirm')}
        variant="danger"
        loading={remove.isPending}
        onPress={() => remove.mutate(post.id, { onSuccess: () => onDone('deleted') })}
      />
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
