import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function SignUpScreen() {
  const { t } = useTranslation('auth');
  return (
    <PlaceholderScreen title={t('signUp.title')}>
      <Link href="/sign-in" style={styles.link}>
        {t('signUp.toSignIn')}
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.body14, color: colors.secondary, padding: spacing.md },
});
