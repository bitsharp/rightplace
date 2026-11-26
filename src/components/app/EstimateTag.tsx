import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { colors, radius, spacing } from '@/theme/tokens';

// Turnout bands may include estimated presence from the venue's habits, not real people (CLAUDE.md principle 2):
// wherever such a band is shown, this label says so.
export function EstimateTag() {
  const { t } = useTranslation('ui');
  return (
    <View accessible accessibilityLabel={t('estimate.a11y')} style={styles.tag}>
      <MonoLabel tone="maybe">{t('estimate.tag')}</MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.maybeBorder,
  },
});
