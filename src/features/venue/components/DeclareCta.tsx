import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import type { DeclarationState } from '../domain/declarationState';

type Props = {
  state: DeclarationState;
  onPress: () => void;
  disabled?: boolean;
};

// Fixed at the bottom so the declaration is always one tap away (principle 10). It says what the tap does
// with my night: declare it, change it here, or move it from another venue.
export function DeclareCta({ state, onPress, disabled = false }: Props) {
  const { t } = useTranslation('venue');
  const here = state.kind === 'here';
  const label = { none: t('cta'), here: t('ctaChange'), elsewhere: t('ctaMove') }[state.kind];
  return (
    <View style={styles.bar}>
      {state.kind === 'here' ? (
        <Text variant="label11" color={state.intent === 'going' ? 'going' : 'maybe'}>
          {t(`ctaStatus.${state.intent}`)}
        </Text>
      ) : null}
      <Button
        label={label}
        variant={here ? 'secondary' : 'primary'}
        onPress={onPress}
        feedback="selection"
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
