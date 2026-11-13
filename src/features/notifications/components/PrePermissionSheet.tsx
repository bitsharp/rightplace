import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { acceptPrePermission, declinePrePermission, usePrePermissionStore } from '../prePermission';

// Our own question comes before the system dialog (which can be shown only once): "Non ora" costs nothing.
export function PrePermissionSheet() {
  const { t } = useTranslation('notifications');
  const open = usePrePermissionStore((state) => state.open);
  return (
    <Sheet visible={open} onClose={declinePrePermission}>
      <View style={styles.content}>
        <MonoLabel tone="going">{t('prePermission.label')}</MonoLabel>
        <Text variant="display22">{t('prePermission.title')}</Text>
        <Text color="textSecondary">{t('prePermission.body')}</Text>
        <Button label={t('prePermission.yes')} onPress={() => void acceptPrePermission()} />
        <Button label={t('prePermission.no')} variant="ghost" onPress={declinePrePermission} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.lg } });
