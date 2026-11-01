import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  trailing?: ReactNode;
};

export function TextField({ label, error, trailing, multiline, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={styles.field}>
      <Text variant="body13Medium" color="textSecondary">
        {label}
      </Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline ? styles.multiline : styles.singleLine,
            { borderColor },
            trailing ? styles.withTrailing : null,
          ]}
          {...input}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text variant="body13" color="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: {
    ...typography.body16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
  },
  singleLine: { height: heights.field, lineHeight: undefined },
  multiline: { minHeight: 96, paddingVertical: spacing.md + 2, textAlignVertical: 'top' },
  withTrailing: { paddingRight: heights.minTapTarget + spacing.sm },
  trailing: {
    position: 'absolute',
    right: spacing.xs,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
