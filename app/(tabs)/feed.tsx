import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function FeedScreen() {
  const { t } = useTranslation('feed');
  return <PlaceholderScreen title={t('title')} />;
}
