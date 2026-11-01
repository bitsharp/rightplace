import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { colors, spacing } from '@/theme/tokens';

import { passwordStrength, type PasswordStrength } from '../domain/password';

const FILLED: Record<PasswordStrength, number> = { weak: 1, fair: 2, strong: 3 };
const TONE = { weak: 'muted', fair: 'maybe', strong: 'going' } as const;
const BAR_COLOR: Record<PasswordStrength, string> = {
  weak: colors.textSecondary,
  fair: colors.maybe,
  strong: colors.going,
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation('auth');
  if (!password) return null;
  const strength = passwordStrength(password);
  return (
    <View style={styles.row}>
      <View
        style={styles.bars}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={[
              styles.bar,
              bar <= FILLED[strength] && { backgroundColor: BAR_COLOR[strength] },
            ]}
          />
        ))}
      </View>
      <MonoLabel tone={TONE[strength]}>{t(`password.strength.${strength}`)}</MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bars: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
});
