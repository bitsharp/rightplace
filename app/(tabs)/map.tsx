import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function MapScreen() {
  const { t } = useTranslation('map');
  return <PlaceholderScreen title={t('title')} />;
}
