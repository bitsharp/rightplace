import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { copyToClipboard } from '@/lib/links/links';
import { spacing } from '@/theme/tokens';

import type { DmMessage } from '../domain/messages';
import { useBlockDmUser, useReportDm } from '../hooks';

export type DmNotice = 'reported' | 'blocked';

type Props = {
  message: DmMessage | null;
  handle: string | null;
  onClose: () => void;
  onDone: (notice: DmNotice) => void;
};

// Long press on a message: copy (mine too) and, on the other person's, the moderation entry points
// (principle 7): block asks for confirmation, report does not.
export function DmMessageActionsSheet({ message, handle, onClose, onDone }: Props) {
  return (
    <Sheet visible={message !== null} onClose={onClose}>
      {message ? (
        <Actions
          key={message.id}
          message={message}
          handle={handle}
          onClose={onClose}
          onDone={onDone}
        />
      ) : null}
    </Sheet>
  );
}

type ActionsProps = Omit<Props, 'message'> & { message: DmMessage };

function Actions({ message, handle, onClose, onDone }: ActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const finish = (notice: DmNotice) => {
    onClose();
    onDone(notice);
  };
  if (confirming) {
    return (
      <BlockConfirm
        message={message}
        handle={handle}
        onClose={onClose}
        onBlocked={() => finish('blocked')}
      />
    );
  }
  return (
    <Choices
      message={message}
      handle={handle}
      onClose={onClose}
      onReported={() => finish('reported')}
      onBlock={() => setConfirming(true)}
    />
  );
}

type ChoicesProps = Pick<ActionsProps, 'message' | 'handle' | 'onClose'> & {
  onReported: () => void;
  onBlock: () => void;
};

function Choices({ message, handle, onClose, onReported, onBlock }: ChoicesProps) {
  const { t } = useTranslation('dm');
  const report = useReportDm();
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {message.isMine
          ? t('actions.copyTitle')
          : t('actions.title', { handle: formatHandle(handle ?? '') })}
      </Text>
      <Button
        label={t('actions.copyText')}
        variant="ghost"
        onPress={() => {
          void copyToClipboard(message.text);
          onClose();
        }}
      />
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

type BlockProps = Pick<ActionsProps, 'message' | 'handle' | 'onClose'> & { onBlocked: () => void };

function BlockConfirm({ message, handle, onClose, onBlocked }: BlockProps) {
  const { t } = useTranslation('dm');
  const block = useBlockDmUser();
  return (
    <View style={styles.body}>
      <Text variant="display17">
        {t('actions.blockTitle', { handle: formatHandle(handle ?? '') })}
      </Text>
      <Text color="textSecondary">{t('actions.blockBody')}</Text>
      <Button
        label={t('actions.blockConfirm')}
        variant="danger"
        onPress={() => block.mutate(message.senderId, { onSuccess: onBlocked })}
      />
      <Button label={t('actions.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
