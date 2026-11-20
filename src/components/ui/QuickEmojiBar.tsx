import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { QUICK_EMOJIS } from '@/features/posts/domain/quickEmojis';
import { heights, radius, spacing } from '@/theme/tokens';

import { Text } from './Text';

type Props = { onPick: (emoji: string) => void };

// Instagram-style shortcut row above a text field. `keyboardShouldPersistTaps` keeps the keyboard (and focus) up.
export function QuickEmojiBar({ onPick }: Props) {
  const { t } = useTranslation('ui');
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {QUICK_EMOJIS.map(({ emoji, key }) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={t('quickEmoji.insert', { name: t(`quickEmoji.names.${key}`) })}
          onPress={() => onPick(emoji)}
          style={styles.button}
        >
          <Text variant="display17">{emoji}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.xs },
  button: {
    minWidth: heights.minTapTarget,
    minHeight: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
});
