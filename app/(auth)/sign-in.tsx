import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { UiKitLink } from '@/features/dev/UiKitLink';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const signIn = useSessionStore((state) => state.signIn);

  return (
    <PlaceholderScreen title={t('signIn.title')}>
      <Button label={t('signIn.demoEnter')} onPress={signIn} />
      <Link href="/sign-up" style={styles.link}>
        {t('signIn.toSignUp')}
      </Link>
      <UiKitLink />
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.body14, color: colors.secondary, padding: spacing.md },
});
