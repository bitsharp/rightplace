import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { colors, heights, spacing } from '@/theme/tokens';

import { PhotoSourceSheet } from '@/components/app/PhotoSourceSheet';
import { ChatComposer } from '../components/ChatComposer';
import { ComposerDock } from '../components/ComposerDock';
import { ExpiryBanner } from '../components/ExpiryBanner';
import { MessageActionsSheet } from '../components/MessageActionsSheet';
import { MessageList } from '../components/MessageList';
import { PhotoStrip } from '../components/PhotoStrip';
import { useNightChatScreen } from '../useNightChatScreen';
import { useNotice } from '../useNotice';

export function NightChatScreen({ roomId }: { roomId: string }) {
  const { t } = useTranslation('chat');
  const screen = useNightChatScreen(roomId);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ChatHeader title={screen.title} onBack={screen.goBack} />
      <View style={styles.top}>
        <ExpiryBanner hours={screen.expiryHours} />
        <PhotoStrip photos={screen.photos} />
      </View>
      {screen.loadFailed ? <EmptyState message={t('loadError')} /> : null}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <MessageList
          messages={screen.messages}
          photoUrls={screen.photoUrls}
          hasMore={screen.hasMore}
          onLoadOlder={() => void screen.loadOlder()}
          onRetry={screen.retry}
          onLongPress={screen.select}
        />
        <ComposerDock>
          <ChatComposer
            followingHandles={screen.followingHandles}
            myHandle={screen.myHandle}
            requestedHandles={screen.requestedHandles}
            onSend={screen.send}
            onPhoto={screen.photoFlow.openSheet}
            onFollow={screen.follow}
          />
        </ComposerDock>
      </KeyboardAvoidingView>
      <ChatOverlays screen={screen} />
    </SafeAreaView>
  );
}

function ChatOverlays({ screen }: { screen: ReturnType<typeof useNightChatScreen> }) {
  const { t } = useTranslation('chat');
  const { t: tUi } = useTranslation('ui');
  const [notice, setNotice] = useNotice();
  const photoNotice = screen.photoFlow.notice;
  return (
    <>
      {notice ? <Toast tone="success" message={t(`actions.${notice}`)} /> : null}
      {photoNotice ? <Toast tone="info" message={tUi(`photoSource.${photoNotice}`)} /> : null}
      <PhotoSourceSheet
        visible={screen.photoFlow.sheetOpen}
        onPick={(source) => void screen.photoFlow.choose(source)}
        onClose={screen.photoFlow.closeSheet}
        onDismiss={screen.photoFlow.onSheetDismiss}
      />
      <MessageActionsSheet
        message={screen.selected}
        onClose={() => screen.select(null)}
        onDone={setNotice}
      />
    </>
  );
}

function ChatHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useTranslation('chat');
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="chevronLeft" />
      </Pressable>
      <View style={styles.titles}>
        <Text accessibilityRole="header" variant="display17" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="body13" color="textSecondary">
          {t('subtitle')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  titles: { flex: 1, gap: spacing.xs },
  back: {
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { gap: spacing.md },
  body: { flex: 1 },
});
