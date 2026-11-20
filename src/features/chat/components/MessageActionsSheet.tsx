import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { copyToClipboard } from '@/lib/links/links';
import { spacing } from '@/theme/tokens';

import type { ChatMessage } from '../domain/messages';
import { useBlockChatUser, useReportChatMessage } from '../hooks';

export type MessageNotice = 'reported' | 'blocked';

type Props = {
  message: ChatMessage | null;
  onClose: () => void;
  onDone: (notice: MessageNotice) => void;
};

// Long press on a message: copy its text (mine too) and, on other people's, the moderation entry point
// (principle 7): block asks for confirmation, report does not.
export function MessageActionsSheet({ message, onClose, onDone }: Props) {
  return (
    <Sheet visible={message !== null} onClose={onClose}>
      {message ? (
        <Actions key={message.id} message={message} onClose={onClose} onDone={onDone} />
      ) : null}
    </Sheet>
  );
}

function Actions({ message, onClose, onDone }: Props & { message: ChatMessage }) {
  const [confirming, setConfirming] = useState(false);
  const finish = (notice: MessageNotice) => {
    onClose();
    onDone(notice);
  };
  if (confirming) {
    return <BlockConfirm message={message} onClose={onClose} onBlocked={() => finish('blocked')} />;
  }
  return (
    <Choices
      message={message}
      onClose={onClose}
      onReported={() => finish('reported')}
      onBlock={() => setConfirming(true)}
    />
  );
}

type ChoicesProps = {
  message: ChatMessage;
  onClose: () => void;
  onReported: () => void;
  onBlock: () => void;
};

function Choices({ message, onClose, onReported, onBlock }: ChoicesProps) {
  const { t } = useTranslation('chat');
  const report = useReportChatMessage();
  const copyable = message.kind === 'text' && Boolean(message.text);
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {message.isMine
          ? t('actions.copyTitle')
          : t('actions.title', { handle: formatHandle(message.handle) })}
      </Text>
      {copyable ? (
        <Button
          label={t('actions.copyText')}
          variant="ghost"
          onPress={() => {
            void copyToClipboard(message.text ?? '');
            onClose();
          }}
        />
      ) : null}
      {message.isMine ? null : (
        <>
          <Button
            label={t('actions.report')}
            variant="ghost"
            onPress={() => report.mutate(message.id, { onSuccess: onReported })}
          />
          <Button label={t('actions.block')} variant="ghost" onPress={onBlock} />
        </>
      )}
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

type BlockProps = { message: ChatMessage; onClose: () => void; onBlocked: () => void };

function BlockConfirm({ message, onClose, onBlocked }: BlockProps) {
  const { t } = useTranslation('chat');
  const block = useBlockChatUser();
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {t('actions.blockTitle', { handle: formatHandle(message.handle) })}
      </Text>
      <Text color="textSecondary">{t('actions.blockBody')}</Text>
      <Button
        label={t('actions.blockConfirm')}
        variant="danger"
        onPress={() => block.mutate(message.userId, { onSuccess: onBlocked })}
      />
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
