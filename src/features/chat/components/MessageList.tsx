import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';

import { MessageBubble } from '@/components/app/MessageBubble';
import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { ChatMessage } from '../domain/messages';

type Props = {
  messages: ChatMessage[];
  photoUrls: Record<string, string>;
  hasMore: boolean;
  onLoadOlder: () => void;
  onRetry: (messageId: string) => void;
  onLongPress: (message: ChatMessage) => void;
};

// Inverted: the newest message sits at the bottom and the "chat created" event is the last item (the top).
export function MessageList({
  messages,
  photoUrls,
  hasMore,
  onLoadOlder,
  onRetry,
  onLongPress,
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
          onRetry={onRetry}
          onLongPress={onLongPress}
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
  onRetry: (messageId: string) => void;
  onLongPress: (message: ChatMessage) => void;
};

function MessageItem({ message, photoUri, onRetry, onLongPress }: ItemProps) {
  const sending = message.pending === true;
  return (
    <MessageBubble
      author={message.isMine ? 'me' : 'other'}
      senderName={message.isMine ? undefined : formatHandle(message.handle)}
      status={message.failed ? 'failed' : sending ? 'sending' : undefined}
      onRetry={() => onRetry(message.id)}
      // moderation applies to other people's delivered messages only
      onLongPress={message.isMine || sending ? undefined : () => onLongPress(message)}
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
