import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  prefix?: 'search' | 'handle';
};

export function SearchField({ label, prefix = 'search', ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.focused]}>
      {prefix === 'search' ? (
        <Icon name="search" color="textSecondary" />
      ) : (
        <Text variant="label12" color="primary" style={styles.at}>
          @
        </Text>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    height: heights.search,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.primary },
  at: { fontFamily: fonts.monoBold, fontSize: 16 },
  input: {
    ...typography.body15,
    flex: 1,
    color: colors.text,
    height: heights.search,
    lineHeight: undefined,
  },
});
