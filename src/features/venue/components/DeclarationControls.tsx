import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { Intent } from '@/features/nights/domain/band';
import { heights, spacing } from '@/theme/tokens';

import type { DeclarationState } from '../domain/declarationState';
import type { PendingConfirm } from './useDeclarationActions';

type ChoiceProps = {
  state: Extract<DeclarationState, { kind: 'none' | 'elsewhere' }>;
  busy: boolean;
  onChoose: (intent: Intent) => void;
};

// Going is the violet primary, Maybe the cyan outline (Serata.dc.html).
export function DeclareChoice({ state, busy, onChoose }: ChoiceProps) {
  const { t } = useTranslation('venue');
  const suffix = state.kind === 'elsewhere' ? 'Here' : '';
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('declare.heading')}</Text>
      {state.kind === 'elsewhere' ? (
        <Text variant="body13" color="textSecondary">
          {t('declare.replaces', { venue: state.venueName })}
        </Text>
      ) : null}
      <Button
        label={t(`declare.going${suffix}`)}
        disabled={busy}
        onPress={() => onChoose('going')}
      />
      <Button
        label={t(`declare.maybe${suffix}`)}
        variant="secondary"
        disabled={busy}
        onPress={() => onChoose('maybe')}
      />
    </View>
  );
}

type DeclaredProps = {
  intent: Intent;
  busy: boolean;
  confirming: PendingConfirm;
  onEdit: () => void;
  onCancel: () => void;
};

export function DeclaredCard({ intent, busy, confirming, onEdit, onCancel }: DeclaredProps) {
  const { t } = useTranslation('venue');
  const action = (value: Intent) => t(`ui:intent.${value}Action`);
  const other = intent === 'going' ? 'maybe' : 'going';
  return (
    <Card tone={intent} style={styles.card}>
      <Text variant="body15Strong">{t('declare.declared', { intent: action(intent) })}</Text>
      {confirming === null ? (
        <View style={styles.row}>
          <Button
            label={t('declare.edit')}
            accessibilityLabel={t('declare.editA11y', { intent: action(other) })}
            variant="secondary"
            size="md"
            disabled={busy}
            onPress={onEdit}
            style={styles.flex}
          />
          <Button
            label={t('declare.cancel')}
            variant="ghost"
            size="md"
            disabled={busy}
            onPress={onCancel}
            style={styles.flex}
          />
        </View>
      ) : null}
    </Card>
  );
}

type ConfirmProps = { kind: Exclude<PendingConfirm, null>; onYes: () => void; onNo: () => void };

// "Light" confirmation (roadmap 08): an inline question, not a blocking alert.
export function ConfirmInline({ kind, onYes, onNo }: ConfirmProps) {
  const { t } = useTranslation('venue');
  return (
    <Card tone="dashed" style={styles.card}>
      <Text variant="body14">{t(`declare.${kind}Confirm`)}</Text>
      <View style={styles.row}>
        <Button
          label={t('declare.confirmYes')}
          variant="danger"
          size="md"
          onPress={onYes}
          style={styles.flex}
        />
        <Button
          label={t('declare.confirmNo')}
          variant="ghost"
          size="md"
          onPress={onNo}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

export function RemoveIconLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('venue');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('declare.remove')}
      onPress={onPress}
      style={styles.remove}
    >
      <Text variant="body13" color="textSecondary" style={styles.underline}>
        {t('declare.remove')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  remove: { minHeight: heights.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
