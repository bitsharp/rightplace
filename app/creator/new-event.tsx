import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function NewEventScreen() {
  const { t } = useTranslation('creator');
  return <PlaceholderScreen title={t('newEvent')} />;
}
