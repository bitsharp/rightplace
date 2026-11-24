import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/api';
import { spacing } from '@/theme/tokens';

import { deleteMyAccount } from '../api';
import { DeleteAccountSheet } from './DeleteAccountSheet';

// "Esci" (outlined) and, last of all, "Delete account" with its double confirmation.
export function AccountFooter() {
  const { t } = useTranslation('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteAccount = async () => {
    await deleteMyAccount();
    await signOut();
  };
  return (
    <View style={styles.footer}>
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
    </View>
  );
}

const styles = StyleSheet.create({ footer: { gap: spacing.md } });
