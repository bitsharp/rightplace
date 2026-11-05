import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { PhotoSource } from '@/lib/photos/photos';

type Props = {
  visible: boolean;
  onPick: (source: PhotoSource) => void;
  onClose: () => void;
  onDismiss?: () => void;
};

export function PhotoSourceSheet({ visible, onPick, onClose, onDismiss }: Props) {
  const { t } = useTranslation('ui');
  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <View style={styles.body}>
        <Text variant="display17">{t('photoSource.title')}</Text>
        <Button label={t('photoSource.camera')} variant="ghost" onPress={() => onPick('camera')} />
        <Button
          label={t('photoSource.library')}
          variant="ghost"
          onPress={() => onPick('library')}
        />
        <Button label={t('photoSource.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
