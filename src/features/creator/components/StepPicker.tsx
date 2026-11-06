import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  label: string;
  valueLabel: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
};

// A date/time chooser built from two buttons: no native picker, no extra library.
export function StepPicker({
  label,
  valueLabel,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}: Props) {
  return (
    <View style={styles.row}>
      <Text variant="body13Medium" color="textSecondary" style={styles.label}>
        {label}
      </Text>
      <View style={styles.control}>
        <StepButton
          label={previousLabel}
          icon="chevronLeft"
          onPress={onPrevious}
          disabled={previousDisabled}
        />
        <Text variant="body15Strong" style={styles.value}>
          {valueLabel}
        </Text>
        <StepButton
          label={nextLabel}
          icon="chevronRight"
          onPress={onNext}
          disabled={nextDisabled}
        />
      </View>
    </View>
  );
}

type StepButtonProps = {
  label: string;
  icon: 'chevronLeft' | 'chevronRight';
  onPress: () => void;
  disabled: boolean;
};

function StepButton({ label, icon, onPress, disabled }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  label: { textTransform: 'none' },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  value: { flex: 1, textAlign: 'center' },
  button: {
    width: heights.minTapTarget,
    height: heights.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
});
