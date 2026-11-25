import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, heights, radius } from '@/theme/tokens';

// Round "go to my location" button: same size and style as the other map buttons.
export function MapLocateButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('map');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('locate')}
      onPress={onPress}
      style={styles.button}
    >
      <Icon name="locate" color="going" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
