import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export type BirthDateParts = { day: string; month: string; year: string };

type Props = {
  value: BirthDateParts;
  onChange: (value: BirthDateParts) => void;
};

const PARTS = [
  { key: 'day', maxLength: 2, flex: 1 },
  { key: 'month', maxLength: 2, flex: 1 },
  { key: 'year', maxLength: 4, flex: 1.6 },
] as const;

// Three numeric boxes instead of a native date picker: no extra native dependency, works in Expo Go.
export function BirthDateField({ value, onChange }: Props) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.field}>
      <Text variant="body13Medium" color="textSecondary">
        {t('form.birthDate')}
      </Text>
      <View style={styles.row}>
        {PARTS.map((part) => (
          <TextInput
            key={part.key}
            accessibilityLabel={t(`form.${part.key}`)}
            placeholder={t(`form.${part.key}Placeholder`)}
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={part.maxLength}
            value={value[part.key]}
            onChangeText={(text) => onChange({ ...value, [part.key]: text.replace(/\D/g, '') })}
            style={[styles.input, { flex: part.flex }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm + 2 },
  input: {
    ...typography.body16,
    lineHeight: undefined,
    height: heights.field,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
  },
});
