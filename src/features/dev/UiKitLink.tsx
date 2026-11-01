import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { typography } from '@/theme/typography';
import { colors, spacing } from '@/theme/tokens';

// Entry point to the dev-only gallery; renders nothing in production builds.
export function UiKitLink() {
  const { t } = useTranslation('dev');
  if (!__DEV__) return null;
  return (
    <Link href="/ui-kit" style={styles.link}>
      {t('open')}
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.label11, color: colors.textSecondary, padding: spacing.md },
});
