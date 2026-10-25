import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function ChatScreen() {
  const { t } = useTranslation('chat');
  return <PlaceholderScreen title={t('title')} />;
}
