import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function NewPostScreen() {
  const { t } = useTranslation('feed');
  return <PlaceholderScreen title={t('newPost')} />;
}
