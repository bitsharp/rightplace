import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useAfterModalDismiss } from '@/lib/useAfterModalDismiss';
import { useLinkActions } from '@/lib/links/linkActionsStore';
import { copyToClipboard, openLink } from '@/lib/links/links';
import { spacing } from '@/theme/tokens';

const NOTICE_MS = 3000;

// One host for the whole app (mounted in the root navigator): the actions sheet of a long-pressed link and the
// "Copiato" / "can't open" toast, so any text with links works without passing callbacks down.
export function LinkActionsHost() {
  return (
    <>
      <LinkSheet />
      <LinkNotice />
    </>
  );
}

function LinkSheet() {
  const { t } = useTranslation('ui');
  const url = useLinkActions((state) => state.sheetUrl);
  const close = useLinkActions((state) => state.closeSheet);
  // Same rule as the photo picker: on iOS the browser opens only once the Modal is gone.
  const deferred = useAfterModalDismiss<string>((link) => void openLink(link));
  // The Modal keeps showing the last link while it slides out.
  const [shown, setShown] = useState<string | null>(null);
  if (url && url !== shown) setShown(url);
  return (
    <Sheet visible={url !== null} onClose={close} onDismiss={deferred.onDismiss}>
      <View style={styles.body}>
        <Text variant="display17">{t('links.title')}</Text>
        <Text variant="body13" color="textSecondary" numberOfLines={3} ellipsizeMode="middle">
          {shown ?? ''}
        </Text>
        <Button
          label={t('links.open')}
          variant="ghost"
          onPress={() => {
            if (url) deferred.request(url);
            close();
          }}
        />
        <Button
          label={t('links.copy')}
          variant="ghost"
          onPress={() => {
            if (url) void copyToClipboard(url);
            close();
          }}
        />
        <Button label={t('links.cancel')} variant="ghost" onPress={close} />
      </View>
    </Sheet>
  );
}

function LinkNotice() {
  const { t } = useTranslation('ui');
  const insets = useSafeAreaInsets();
  const notice = useLinkActions((state) => state.notice);
  const setNotice = useLinkActions((state) => state.setNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  if (!notice) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + spacing.xxl }]}>
      <Toast tone={notice === 'copied' ? 'success' : 'info'} message={t(`links.${notice}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl },
});
