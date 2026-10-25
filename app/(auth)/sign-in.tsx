import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { colors, fonts } from '@/theme/tokens';

export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const signIn = useSessionStore((state) => state.signIn);

  return (
    <PlaceholderScreen title={t('signIn.title')}>
      <Pressable accessibilityRole="button" onPress={signIn} style={styles.button}>
        <Text style={styles.buttonLabel}>{t('signIn.demoEnter')}</Text>
      </Pressable>
      <Link href="/sign-up" style={styles.link}>
        {t('signIn.toSignUp')}
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.background },
  link: { fontFamily: fonts.body, fontSize: 14, color: colors.secondary, padding: 12 },
});
