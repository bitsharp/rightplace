import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { Person } from '../api';
import { useBlockUser, useReportUser } from '../hooks';

export type PersonNotice = 'reported' | 'blocked';

type Props = {
  person: Person | null;
  onClose: () => void;
  onDone: (notice: PersonNotice) => void;
};

// Moderation entry point on a long press (principle 7): block asks for confirmation, report does not.
export function PersonSheet({ person, onClose, onDone }: Props) {
  return (
    <Sheet visible={person !== null} onClose={onClose}>
      {person ? (
        <PersonMenu key={person.userId} person={person} onClose={onClose} onDone={onDone} />
      ) : null}
    </Sheet>
  );
}

function PersonMenu({ person, onClose, onDone }: Props & { person: Person }) {
  const { t } = useTranslation('friends');
  const [confirming, setConfirming] = useState(false);
  const block = useBlockUser();
  const report = useReportUser();
  const handle = formatHandle(person.handle);
  const finish = (notice: PersonNotice) => {
    onClose();
    onDone(notice);
  };
  if (confirming) {
    return (
      <View style={styles.body}>
        <Text variant="display17">{t('person.blockTitle', { handle })}</Text>
        <Text color="textSecondary">{t('person.blockBody')}</Text>
        <Button
          label={t('person.blockConfirm')}
          variant="danger"
          onPress={() => block.mutate(person.userId, { onSuccess: () => finish('blocked') })}
        />
        <Button label={t('person.cancel')} variant="ghost" onPress={onClose} />
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <Text variant="display17">{handle}</Text>
      <Button label={t('person.block')} variant="ghost" onPress={() => setConfirming(true)} />
      <Button
        label={t('person.report')}
        variant="ghost"
        onPress={() => report.mutate(person.userId, { onSuccess: () => finish('reported') })}
      />
      <Button label={t('person.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
