import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

type Props = { error: boolean; onRetry: () => void };

// Shown while the session/profile loads; offers a retry instead of an endless spinner.
export function BootScreen({ error, onRetry }: Props) {
  const { t } = useTranslation('common');
  return (
    <Screen>
      {error ? (
        <>
          <Text color="textSecondary">{t('boot.error')}</Text>
          <Button label={t('boot.retry')} onPress={onRetry} />
        </>
      ) : (
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('boot.loading')} />
      )}
    </Screen>
  );
}
