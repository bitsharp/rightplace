import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// The email is read-only and never shown to other users: only the account owner sees it, here.
export function EmailCard({ email }: { email: string }) {
  const { t } = useTranslation('profile');
  return (
    <Card style={styles.card}>
      <Text variant="body13" color="textSecondary">
        {t('account.email')}
      </Text>
      <Text variant="body15Strong">{email}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.xs } });
