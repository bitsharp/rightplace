import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

// Double confirmation: explain what is erased, then a final, explicit "delete".
export function DeleteAccountSheet({ visible, onClose, onConfirm }: Props) {
  const { t } = useTranslation('profile');
  const [step, setStep] = useState<'explain' | 'confirm'>('explain');
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setStep('explain');
    onClose();
  };
  const confirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <Sheet visible={visible} onClose={close}>
      <Text accessibilityRole="header" variant="display17">
        {t(`delete.${step}Title`)}
      </Text>
      <Text color="textSecondary">{t(`delete.${step}Body`)}</Text>
      {step === 'explain' ? (
        <Button label={t('delete.continue')} variant="danger" onPress={() => setStep('confirm')} />
      ) : (
        <Button label={t('delete.confirm')} variant="danger" onPress={confirm} loading={deleting} />
      )}
      <Button label={t('delete.cancel')} variant="ghost" size="md" onPress={close} />
    </Sheet>
  );
}
