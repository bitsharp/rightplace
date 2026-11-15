import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import type { RpcErrorCode } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

import { nextHandleChangeAt, normalizeHandle } from '../domain/handle';
import { useRegenerateHandle, useSetHandle } from '../useHandleChange';
import { useHandleAvailability, type HandleCheck } from '../useHandleAvailability';

// onboarding: the @tag is free until "Continua" (no limit, no date shown); profile: one change every 30 days.
type Props = {
  handle: string;
  handleChangedAt: string | null;
  handleFreeChangeUsed: boolean;
  phase: 'onboarding' | 'profile';
};

type Status = { key: string; tone: 'error' | 'maybe' | 'textSecondary' } | null;

function statusOf(check: HandleCheck): Status {
  switch (check.kind) {
    case 'idle':
      return null;
    case 'format':
      return { key: `handleEditor.format.${check.error}`, tone: 'error' };
    case 'checking':
      return { key: 'handleEditor.status.checking', tone: 'textSecondary' };
    case 'error':
      return { key: 'handleEditor.status.error', tone: 'textSecondary' };
    case 'result':
      return check.value === 'available'
        ? { key: 'handleEditor.status.available', tone: 'maybe' }
        : { key: `handleEditor.status.${camel(check.value)}`, tone: 'error' };
  }
}

const camel = (value: string) => value.replace(/_(\w)/, (_, char: string) => char.toUpperCase());

const canSave = (check: HandleCheck) =>
  check.kind === 'error' || (check.kind === 'result' && check.value === 'available');

// Mount it with key={handle}: the field starts from the current @tag and restarts when it changes.
export function HandleEditor({ handle, handleChangedAt, handleFreeChangeUsed, phase }: Props) {
  const { t, i18n } = useTranslation('profile');
  const setHandle = useSetHandle();
  const regenerate = useRegenerateHandle();
  const [typed, setTyped] = useState(handle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RpcErrorCode | null>(null);
  const check = useHandleAvailability(typed, handle);
  const next =
    phase === 'onboarding'
      ? null
      : nextHandleChangeAt(
          { changedAt: handleChangedAt, freeChangeUsed: handleFreeChangeUsed },
          new Date(),
        );
  const status = statusOf(check);

  const run = async (action: () => Promise<RpcErrorCode | null>) => {
    setBusy(true);
    setError(await action());
    setBusy(false);
  };

  return (
    <View style={styles.editor}>
      <TextField
        label={t('handleEditor.label')}
        value={typed}
        onChangeText={(text) => setTyped(normalizeHandle(text))}
        leading="@"
        autoCapitalize="none"
        autoCorrect={false}
        editable={next === null}
        error={status?.tone === 'error' ? t(status.key) : undefined}
      />
      {status && status.tone !== 'error' ? (
        <Text variant="body13" color={status.tone}>
          {t(status.key)}
        </Text>
      ) : null}
      <Text variant="body13" color="textSecondary">
        {t('handleEditor.warning')}
      </Text>
      <Text variant="body13" color="textSecondary">
        {t('handleEditor.rules')}
      </Text>
      {phase === 'profile' ? (
        <Text variant="body13" color="textSecondary">
          {next
            ? t('handleEditor.nextChange', {
                date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(next),
              })
            : t(handleFreeChangeUsed ? 'handleEditor.limit' : 'handleEditor.freeChange')}
        </Text>
      ) : null}
      {error ? <Text color="error">{t(`errors:rpc.${error}`)}</Text> : null}
      <Button
        label={t('handleEditor.save')}
        onPress={() => run(() => setHandle(typed))}
        disabled={next !== null || !canSave(check)}
        loading={busy}
        feedback="confirm"
      />
      <Button
        label={t('handleEditor.random')}
        variant="ghost"
        size="md"
        onPress={() => run(regenerate)}
        disabled={next !== null || busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({ editor: { gap: spacing.sm } });
