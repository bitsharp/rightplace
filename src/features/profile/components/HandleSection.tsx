import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { formatHandle } from '../domain/handle';
import { HandleEditor } from './HandleEditor';

type Props = { handle: string; handleChangedAt: string | null; handleFreeChangeUsed: boolean };

// The name shown to others is always the @handle: chosen by the user (or drawn), never a real name.
export function HandleSection({ handle, handleChangedAt, handleFreeChangeUsed }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('handleSection.title')}</MonoLabel>
      <Text variant="display17" color="primary">
        {formatHandle(handle)}
      </Text>
      <HandleEditor
        key={handle}
        handle={handle}
        handleChangedAt={handleChangedAt}
        handleFreeChangeUsed={handleFreeChangeUsed}
        phase="profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({ section: { gap: spacing.sm } });
