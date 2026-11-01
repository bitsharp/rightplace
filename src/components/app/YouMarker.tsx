import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

// Coarse position only (~500 m, CLAUDE.md principle 3): the halo hints that it is approximate.
export function YouMarker() {
  const { t } = useTranslation('ui');
  return (
    <View accessible accessibilityLabel={t('you')} style={styles.halo}>
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.youHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.background,
  },
});
