import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { RpcErrorCode } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

import { formatHandle } from '../domain/handle';
import { useRegenerateHandle } from '../useRegenerateHandle';

type Props = { handle: string; alreadyChanged: boolean };

// The name shown to others is always the @handle: it cannot be chosen, only drawn again, once.
export function HandleSection({ handle, alreadyChanged }: Props) {
  const { t } = useTranslation('profile');
  const regenerate = useRegenerateHandle();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RpcErrorCode | null>(null);

  const draw = async () => {
    setBusy(true);
    setError(await regenerate());
    setBusy(false);
    setConfirming(false);
  };

  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('handleSection.title')}</MonoLabel>
      <Text variant="display17" color="primary">
        {formatHandle(handle)}
      </Text>
      <Text variant="body13" color="textSecondary">
        {t(alreadyChanged ? 'handleSection.used' : 'handleSection.once')}
      </Text>
      {error ? <Text color="error">{t(`errors:rpc.${error}`)}</Text> : null}
      {alreadyChanged ? null : confirming ? (
        <>
          <Text variant="body13">{t('handleSection.confirm')}</Text>
          <Button label={t('handleSection.confirmYes')} onPress={draw} loading={busy} />
          <Button
            label={t('handleSection.confirmNo')}
            variant="ghost"
            size="md"
            onPress={() => setConfirming(false)}
          />
        </>
      ) : (
        <Button
          label={t('handleSection.change')}
          variant="secondary"
          size="md"
          onPress={() => setConfirming(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ section: { gap: spacing.sm } });
