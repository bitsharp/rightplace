import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { PhotoSource } from '@/lib/photos/photos';
import { spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  hasPhoto: boolean;
  onPick: (source: PhotoSource) => void;
  onRemove: () => void;
  onClose: () => void;
  onDismiss?: () => void;
};

// One sheet for "change photo" (camera / gallery) and "remove photo": the picker is launched only after this
// Modal is gone (onDismiss), so there is no second sheet to present on top of it.
export function AvatarSheet({ visible, hasPhoto, onPick, onRemove, onClose, onDismiss }: Props) {
  const { t } = useTranslation('profile');
  const { t: tUi } = useTranslation('ui');
  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <View style={styles.body}>
        <Text variant="display17">{t('avatar.title')}</Text>
        <Text variant="body13" color="textSecondary">
          {t('avatar.hint')}
        </Text>
        <Button
          label={tUi('photoSource.camera')}
          variant="ghost"
          onPress={() => onPick('camera')}
        />
        <Button
          label={tUi('photoSource.library')}
          variant="ghost"
          onPress={() => onPick('library')}
        />
        {hasPhoto ? <Button label={t('avatar.remove')} variant="ghost" onPress={onRemove} /> : null}
        <Button label={tUi('photoSource.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
