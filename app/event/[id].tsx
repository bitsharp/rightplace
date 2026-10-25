import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function EventScreen() {
  const { t } = useTranslation('venue');
  return <PlaceholderScreen title={t('eventTitle')} />;
}
