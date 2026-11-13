import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { onDeclarationSheetDismiss } from '@/features/notifications/prePermission';
import type { Intent } from '@/features/nights/domain/band';
import type { LatLng } from '@/features/profile/domain/coarsen';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

import { SPOT_NAME_MAX, validateSpotName } from '../domain/spotName';
import { useDeclareAtSpot } from '../hooks';

type Props = {
  // The point chosen with the long press; null keeps the sheet closed.
  point: LatLng | null;
  onClose: () => void;
};

// "Serata in questo punto": name + SI/FORSE in one sheet, so long press → name → SI stays within 3 taps (principle 10).
export function SpotSheet({ point, onClose }: Props) {
  return (
    <Sheet visible={point !== null} onClose={onClose} onDismiss={onDeclarationSheetDismiss}>
      {point ? (
        <SpotForm key={`${point.lat}:${point.lng}`} point={point} onClose={onClose} />
      ) : null}
    </Sheet>
  );
}

function SpotForm({ point, onClose }: { point: LatLng; onClose: () => void }) {
  const { t } = useTranslation('spots');
  const declare = useDeclareAtSpot();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const check = validateSpotName(name);
  const nameError = submitted && check !== 'ok' ? t(`nameError.${check}`) : undefined;
  const serverCode = rpcErrorCodeOf(declare.error);

  const choose = (intent: Intent) => {
    setSubmitted(true);
    if (check !== 'ok') return;
    declare.mutate({ ...point, name, intent }, { onSuccess: onClose });
  };

  return (
    <View style={styles.form} accessibilityLabel={t('sheet.a11y')}>
      <MonoLabel tone="maybe">{t('sheet.label')}</MonoLabel>
      <Text variant="display22">{t('sheet.title')}</Text>
      <TextField
        label={t('sheet.nameLabel')}
        placeholder={t('sheet.namePlaceholder')}
        value={name}
        onChangeText={setName}
        maxLength={SPOT_NAME_MAX + 10}
        error={nameError}
        autoCapitalize="sentences"
        returnKeyType="done"
      />
      <Text variant="body12" color="textSecondary">
        {t('sheet.visibility')}
      </Text>
      {serverCode ? (
        <Text variant="body13" color="error">
          {t(`errors:rpc.${serverCode}`)}
        </Text>
      ) : null}
      <Button
        label={t('sheet.going')}
        loading={declare.isPending}
        onPress={() => choose('going')}
      />
      <Button
        label={t('sheet.maybe')}
        variant="secondary"
        disabled={declare.isPending}
        onPress={() => choose('maybe')}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
