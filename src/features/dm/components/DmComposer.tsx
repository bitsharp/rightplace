import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { QuickEmojiBar } from '@/components/ui/QuickEmojiBar';
import { useComposer } from '@/features/chat/useComposer';
import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { MAX_DM_LENGTH } from '../domain/messages';

type Props = {
  // `onSent` runs once the server saved the message: only then the field is cleared, so a failed send keeps the text.
  onSend: (text: string, onSent: () => void) => void;
  disabled: boolean;
};

export function DmComposer({ onSend, disabled }: Props) {
  const { t } = useTranslation('dm');
  const composer = useComposer([], [], '');
  const trimmed = composer.text.trim();
  const canSend = trimmed !== '' && !disabled;
  const send = () => {
    if (canSend) onSend(trimmed, composer.clear);
  };
  return (
    <View style={styles.box}>
      <QuickEmojiBar onPick={composer.insertEmoji} />
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={t('thread.placeholder')}
          placeholder={t('thread.placeholder')}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          value={composer.text}
          selection={composer.forcedSelection}
          onChangeText={composer.changeText}
          onSelectionChange={(event) => composer.changeSelection(event.nativeEvent.selection)}
          maxLength={MAX_DM_LENGTH}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('thread.send')}
          accessibilityState={{ disabled: !canSend }}
          onPress={send}
          style={[styles.send, canSend ? null : styles.sendOff]}
        >
          <Icon name="send" color="onAccent" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    ...typography.body15,
    flex: 1,
    maxHeight: 120,
    minHeight: heights.minTapTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  send: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.going,
  },
  sendOff: { opacity: 0.4 },
});
