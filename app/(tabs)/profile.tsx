import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { UiKitLink } from '@/features/dev/UiKitLink';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <PlaceholderScreen title={t('title')}>
      <Link href="/creator" style={styles.link}>
        {t('creatorProfile')}
      </Link>
      <Button label={t('signOut')} variant="ghost" size="md" onPress={signOut} />
      <UiKitLink />
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.body14, color: colors.secondary, padding: spacing.md },
});
