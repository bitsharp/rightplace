import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function NightChatScreen() {
  const { t } = useTranslation('chat');
  return <PlaceholderScreen title={t('nightTitle')} />;
}
