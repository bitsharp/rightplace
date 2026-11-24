import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';

import { MessageBubble } from '@/components/app/MessageBubble';
import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { ChatMessage } from '../domain/messages';

type Props = {
  messages: ChatMessage[];
  photoUrls: Record<string, string>;
  // Signed profile photos by user id; missing = the initial.
  avatarUrls: Record<string, string>;
  hasMore: boolean;
  onLoadOlder: () => void;
  onRetry: (messageId: string) => void;
  onLongPress: (message: ChatMessage) => void;
  onOpenPhoto: (messageId: string) => void;
};

// Inverted: the newest message sits at the bottom and the "chat created" event is the last item (the top).
export function MessageList({
  messages,
  photoUrls,
  avatarUrls,
  hasMore,
  onLoadOlder,
  onRetry,
  onLongPress,
  onOpenPhoto,
}: Props) {
  const { t } = useTranslation('chat');
  return (
    <FlatList
      inverted
      data={messages}
      keyExtractor={(message) => message.id}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onEndReached={hasMore ? onLoadOlder : undefined}
      renderItem={({ item }) => (
        <MessageItem
          message={item}
          photoUri={photoUrls[item.id]}
          avatarUrls={avatarUrls}
          onRetry={onRetry}
          onLongPress={onLongPress}
          onOpenPhoto={onOpenPhoto}
        />
      )}
      ListFooterComponent={
        <>
          {hasMore ? (
            <Button label={t('loadOlder')} variant="ghost" size="md" onPress={onLoadOlder} />
          ) : null}
          <MonoLabel tone="muted">{t('created')}</MonoLabel>
        </>
      }
      ListFooterComponentStyle={styles.footer}
    />
  );
}

type ItemProps = {
  message: ChatMessage;
  photoUri: string | undefined;
  avatarUrls: Record<string, string>;
  onRetry: (messageId: string) => void;
  onLongPress: (message: ChatMessage) => void;
  onOpenPhoto: (messageId: string) => void;
};

function canOpenActions(message: ChatMessage): boolean {
  if (message.pending || message.failed) return false;
  return !message.isMine || message.kind === 'text';
}

function MessageItem({
  message,
  photoUri,
  avatarUrls,
  onRetry,
  onLongPress,
  onOpenPhoto,
}: ItemProps) {
  const sending = message.pending === true;
  return (
    <MessageBubble
      author={message.isMine ? 'me' : 'other'}
      senderName={message.isMine ? undefined : formatHandle(message.handle)}
      senderAvatar={
        message.isMine
          ? undefined
          : {
              initial: message.handle.replace(/^@/, '').charAt(0),
              photo: avatarPhotoFor(avatarUrls, message.userId),
            }
      }
      status={message.failed ? 'failed' : sending ? 'sending' : undefined}
      onRetry={() => onRetry(message.id)}
      // delivered messages only: copy (mine included) and, on other people's, moderation
      onLongPress={canOpenActions(message) ? () => onLongPress(message) : undefined}
      onOpenPhoto={
        message.kind === 'photo' && !sending && !message.failed
          ? () => onOpenPhoto(message.id)
          : undefined
      }
      content={
        message.kind === 'photo'
          ? { kind: 'photo', uri: photoUri }
          : { kind: 'text', text: message.text ?? '' }
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md },
  footer: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
