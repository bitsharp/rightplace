import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LinkedText } from '@/components/ui/LinkedText';
import { ProfileLink } from '@/components/ui/ProfileLink';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { formatHandle } from '@/features/profile/domain/handle';
import { useOpenProfile, type ProfileTarget } from '@/features/profile/useOpenProfile';
import { afterModalDismiss } from '@/lib/afterModalDismiss';
import { spacing } from '@/theme/tokens';

import type { PostComment } from '../domain/types';
import { useComments } from '../hooks';
import { CommentActions, type CommentNotice } from './CommentActions';
import { CommentComposer } from './CommentComposer';

const NOTICE_MS = 3000;

type Props = { postId: string | null; onClose: () => void };

export function CommentsSheet({ postId, onClose }: Props) {
  const openProfile = useOpenProfile();
  // Same rule as the link sheet: on iOS the navigation runs only once the Modal is gone.
  const [deferred] = useState(() => afterModalDismiss<ProfileTarget>(Platform.OS, openProfile));
  const openAuthor = (target: ProfileTarget) => {
    deferred.request(target);
    onClose();
  };
  return (
    <Sheet visible={postId !== null} onClose={onClose} onDismiss={deferred.onDismiss}>
      {postId ? (
        <CommentsBody key={postId} postId={postId} onClose={onClose} onOpenAuthor={openAuthor} />
      ) : null}
    </Sheet>
  );
}

// One Modal only: the long-press actions replace the list inside the same sheet (a second Modal
// opened over a closing one is unreliable on iOS).
type BodyProps = {
  postId: string;
  onClose: () => void;
  onOpenAuthor: (target: ProfileTarget) => void;
};

function CommentsBody({ postId, onClose, onOpenAuthor }: BodyProps) {
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
      <CommentList postId={postId} onSelect={setSelected} onOpenAuthor={onOpenAuthor} />
      {notice ? <Toast tone="success" message={t(`actions.${notice}`)} /> : null}
      <CommentComposer postId={postId} />
    </View>
  );
}

type ListProps = {
  postId: string;
  onSelect: (comment: PostComment) => void;
  onOpenAuthor: (target: ProfileTarget) => void;
};

function CommentList({ postId, onSelect, onOpenAuthor }: ListProps) {
  const { t } = useTranslation('feed');
  const { comments, isLoading, isError, hasOlder, loadOlder } = useComments(postId);
  // One request for every author; the server only signs the photos I may see.
  const avatars = useAvatarUrls(comments.map((comment) => comment.userId));
  const openAuthor = (comment: PostComment) =>
    onOpenAuthor({ handle: comment.handle, isMine: comment.isMine });
  if (isError) return <Text color="textSecondary">{t('comments.loadError')}</Text>;
  if (!isLoading && comments.length === 0) {
    return <Text color="textSecondary">{t('comments.empty')}</Text>;
  }
  return (
    <ScrollView
      testID="comments-list"
      keyboardShouldPersistTaps="handled"
      style={styles.list}
      contentContainerStyle={styles.listContent}
    >
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
          <ProfileLink handle={comment.handle} onPress={() => openAuthor(comment)}>
            <Avatar
              intent={comment.isMine ? 'neutral' : 'going'}
              size={28}
              initial={comment.handle.replace(/^@/, '').charAt(0)}
              photo={avatarPhotoFor(avatars, comment.userId)}
            />
          </ProfileLink>
          <View style={styles.commentBody}>
            <ProfileLink handle={comment.handle} onPress={() => openAuthor(comment)}>
              <Text variant="body13Medium" color="textSecondary">
                {formatHandle(comment.handle)}
              </Text>
            </ProfileLink>
            {/* Inside this Modal the link sheet would be a second Modal: long press opens the comment actions. */}
            <LinkedText
              testID="comment-text"
              text={comment.text}
              variant="body14"
              onLinkLongPress={() => onSelect(comment)}
            />
          </View>
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
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  commentBody: { flex: 1, minWidth: 0, gap: 2 },
});
