import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type Props = { count: number; index: number };

export function PageDots({ count, index }: Props) {
  const { t } = useTranslation('tour');
  return (
    <View
      accessible
      accessibilityLabel={t('welcome.pageA11y', { page: index + 1, total: count })}
      style={styles.row}
    >
      {Array.from({ length: count }, (_, dot) => (
        <View
          key={dot}
          testID={dot === index ? 'page-dot-active' : 'page-dot'}
          style={[styles.dot, dot === index && styles.active]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  active: { width: 24, backgroundColor: colors.primary },
});
