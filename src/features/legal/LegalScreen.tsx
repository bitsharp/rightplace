import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

const DOCS = ['privacy', 'terms'] as const;
type Doc = (typeof DOCS)[number];

// Provisional summary of the guarantees in supabase/README.md; the full texts arrive with prompt 16.
export function LegalScreen() {
  const { t } = useTranslation('legal');
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const current: Doc = DOCS.find((candidate) => candidate === doc) ?? 'privacy';
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen scroll>
      <Text accessibilityRole="header" variant="display24">
        {t(`${current}.title`)}
      </Text>
      <Text variant="body13" color="textSecondary">
        {t('provisional')}
      </Text>
      <Text>{t(`${current}.body`)}</Text>
      <Button label={t('back')} variant="ghost" size="md" onPress={back} />
    </Screen>
  );
}
