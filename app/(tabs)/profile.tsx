import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { colors, fonts } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <PlaceholderScreen title={t('title')}>
      <Link href="/creator" style={styles.link}>
        {t('creatorProfile')}
      </Link>
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.button}>
        <Text style={styles.buttonLabel}>{t('signOut')}</Text>
      </Pressable>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  buttonLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.body, fontSize: 14, color: colors.secondary, padding: 12 },
});
