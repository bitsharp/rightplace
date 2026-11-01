import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { signOut } from '@/features/auth/api';
import { AuthLink } from '@/features/auth/components/AuthFields';
import { spacing } from '@/theme/tokens';

import { deleteMyAccount } from '../api';
import { DeleteAccountSheet } from './DeleteAccountSheet';

export function AccountSection({ email }: { email: string }) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('account.title')}</MonoLabel>
      <Card style={styles.email}>
        <Text variant="body13" color="textSecondary">
          {t('account.email')}
        </Text>
        <Text variant="body15Strong">{email}</Text>
      </Card>
      <AccountActions />
      <View style={styles.links}>
        <AuthLink href="/legal/privacy" label={t('account.privacy')} />
        <AuthLink href="/legal/terms" label={t('account.terms')} />
      </View>
    </View>
  );
}

function AccountActions() {
  const { t } = useTranslation('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteAccount = async () => {
    await deleteMyAccount();
    await signOut();
  };
  return (
    <>
      <Button
        label={t('account.changePassword')}
        variant="ghost"
        size="md"
        onPress={() => router.push('/reset-password')}
      />
      <Button
        label={t('account.signOut')}
        variant="ghost"
        size="md"
        onPress={() => void signOut()}
      />
      <Button
        label={t('account.delete')}
        variant="danger"
        size="md"
        onPress={() => setDeleteOpen(true)}
      />
      <DeleteAccountSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  email: { gap: spacing.xs },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
});
