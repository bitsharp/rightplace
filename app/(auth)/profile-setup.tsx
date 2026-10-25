import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function ProfileSetupScreen() {
  const { t } = useTranslation('auth');
  return <PlaceholderScreen title={t('profileSetup.title')} />;
}
