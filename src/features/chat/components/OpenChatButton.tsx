import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

// Entry point to the night chat from the venue page (shown only to people who declared there).
export function OpenChatButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('chat');
  return (
    <Button label={t('openFromVenue')} variant="ghost" onPress={onPress} feedback="selection" />
  );
}
