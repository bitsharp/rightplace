import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function FriendsScreen() {
  const { t } = useTranslation('friends');
  return <PlaceholderScreen title={t('title')} />;
}
