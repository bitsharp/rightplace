import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { colors, fonts } from '@/theme/tokens';

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
  link: { fontFamily: fonts.body, fontSize: 14, color: colors.secondary, padding: 12 },
});
