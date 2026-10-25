import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function VenueScreen() {
  const { t } = useTranslation('venue');
  return <PlaceholderScreen title={t('title')} />;
}
