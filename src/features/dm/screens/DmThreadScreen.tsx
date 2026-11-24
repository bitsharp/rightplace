import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComposerDock } from '@/features/chat/components/ComposerDock';
import { useNotice } from '@/features/chat/useNotice';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { colors, spacing } from '@/theme/tokens';

import { DmComposer } from '../components/DmComposer';
import { DmHeader } from '../components/DmHeader';
import { DmMessageActionsSheet } from '../components/DmMessageActionsSheet';
import { DmMessageList } from '../components/DmMessageList';
import { useDmThreadScreen } from '../useDmThreadScreen';

type Props = { threadId: string; handle?: string; userId?: string };

export function DmThreadScreen({ threadId, handle, userId }: Props) {
  const { t } = useTranslation('dm');
  const { t: tErrors } = useTranslation('errors');
  const screen = useDmThreadScreen(threadId, { handle, userId });
  const [notice, setNotice] = useNotice();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <DmHeader
        handle={screen.handle}
        avatarPhoto={screen.avatarPhoto}
        onBack={screen.goBack}
        onOpenProfile={screen.openProfile}
      />
      <Text variant="body13" color="textSecondary">
        {t('thread.banner')}
      </Text>
      {screen.loadFailed ? <EmptyState message={t('thread.loadError')} /> : null}
      {/* Same strategy on iOS and Android: with edge-to-edge the window never resizes for the keyboard. */}
      <KeyboardAvoidingView testID="dm-keyboard-avoider" style={styles.body} behavior="padding">
        <DmMessageList
          messages={screen.messages}
          hasMore={screen.hasMore}
          onLoadOlder={screen.loadOlder}
          onLongPress={screen.select}
        />
        {screen.sendError ? (
          <Text variant="body13" color="error">
            {tErrors(`rpc.${screen.sendError}`)}
          </Text>
        ) : null}
        <ComposerDock>
          {screen.closed ? (
            <Text variant="body13" color="textSecondary">
              {t('thread.closed')}
            </Text>
          ) : (
            <DmComposer onSend={screen.send} disabled={screen.isSending} />
          )}
        </ComposerDock>
      </KeyboardAvoidingView>
      {notice ? <Toast tone="success" message={t(`actions.${notice}`)} /> : null}
      <DmMessageActionsSheet
        message={screen.selected}
        handle={screen.handle}
        onClose={() => screen.select(null)}
        onDone={(done) => {
          setNotice(done);
          if (done === 'blocked') screen.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  body: { flex: 1 },
});
