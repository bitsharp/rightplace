import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { confirmFeedback, selectionFeedback } from '@/lib/haptics';
import { colors, heights, radius, spacing, type ColorToken } from '@/theme/tokens';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'creator' | 'ghost' | 'danger';
type Size = 'lg' | 'md';
type Feedback = 'confirm' | 'selection';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  feedback?: Feedback;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

const VARIANTS: Record<ButtonVariant, { container: ViewStyle; text: ColorToken }> = {
  primary: { container: { backgroundColor: colors.going }, text: 'onAccent' },
  secondary: {
    container: { backgroundColor: colors.maybeTint, borderWidth: 1, borderColor: colors.maybe },
    text: 'text',
  },
  creator: { container: { backgroundColor: colors.maybe }, text: 'onAccent' },
  ghost: { container: { borderWidth: 1, borderColor: colors.border }, text: 'text' },
  danger: { container: { backgroundColor: colors.text }, text: 'onAccent' },
};

const FEEDBACK: Record<Feedback, () => void> = {
  confirm: confirmFeedback,
  selection: selectionFeedback,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  ...rest
}: Props) {
  const { disabled = false, feedback, accessibilityLabel, style } = rest;
  const inactive = disabled || loading;
  const handlePress = () => {
    if (feedback) FEEDBACK[feedback]();
    onPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        VARIANTS[variant].container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <ButtonContent label={label} size={size} loading={loading} color={VARIANTS[variant].text} />
    </Pressable>
  );
}

type ContentProps = { label: string; size: Size; loading: boolean; color: ColorToken };

function ButtonContent({ label, size, loading, color }: ContentProps) {
  if (loading) return <ActivityIndicator testID="button-spinner" color={colors[color]} />;
  return (
    <Text variant={size === 'lg' ? 'body16Strong' : 'body14Medium'} color={color}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lg: { height: heights.button, borderRadius: radius.buttonLarge },
  md: { height: heights.buttonMedium, borderRadius: radius.segmented },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
