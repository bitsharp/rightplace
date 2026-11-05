import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { ChatMessage } from '../domain/messages';
import { useBlockChatUser, useReportChatMessage } from '../hooks';

export type MessageNotice = 'reported' | 'blocked';

type Props = {
  message: ChatMessage | null;
  onClose: () => void;
  onDone: (notice: MessageNotice) => void;
};

// Moderation entry point on a long press (principle 7): block asks for confirmation, report does not.
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
  const { t } = useTranslation('chat');
  const [confirming, setConfirming] = useState(false);
  const report = useReportChatMessage();
  const block = useBlockChatUser();
  const handle = formatHandle(message.handle);
  const finish = (notice: MessageNotice) => {
    onClose();
    onDone(notice);
  };
  if (confirming) {
    return (
      <View style={styles.body}>
        <Text variant="display17">{t('actions.blockTitle', { handle })}</Text>
        <Text color="textSecondary">{t('actions.blockBody')}</Text>
        <Button
          label={t('actions.blockConfirm')}
          variant="danger"
          onPress={() => block.mutate(message.userId, { onSuccess: () => finish('blocked') })}
        />
        <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <Text variant="display17">{t('actions.title', { handle })}</Text>
      <Button
        label={t('actions.report')}
        variant="ghost"
        onPress={() => report.mutate(message.id, { onSuccess: () => finish('reported') })}
      />
      <Button label={t('actions.block')} variant="ghost" onPress={() => setConfirming(true)} />
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
