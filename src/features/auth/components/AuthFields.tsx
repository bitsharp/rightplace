import { Link, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type EmailFieldProps = { value: string; onChangeText: (email: string) => void };

export function EmailField({ value, onChangeText }: EmailFieldProps) {
  const { t } = useTranslation('auth');
  return (
    <TextField
      label={t('fields.email')}
      placeholder={t('fields.emailPlaceholder')}
      value={value}
      onChangeText={onChangeText}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      textContentType="emailAddress"
    />
  );
}

export function AuthLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} style={styles.link}>
      {label}
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    ...typography.body14,
    color: colors.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
