import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, heights, radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { useComposer } from '../useComposer';
import { FollowChip } from './FollowChip';
import { MentionSuggestions } from './MentionSuggestions';

type Props = {
  followingHandles: string[];
  myHandle: string;
  requestedHandles: string[];
  onSend: (text: string) => void;
  onPhoto: () => void;
  onFollow: (handle: string) => void;
};

export function ChatComposer({
  followingHandles,
  myHandle,
  requestedHandles,
  onSend,
  onPhoto,
  onFollow,
}: Props) {
  const composer = useComposer(followingHandles, myHandle);
  const trimmed = composer.text.trim();
  const send = () => {
    if (trimmed === '') return;
    onSend(trimmed);
    composer.clear();
  };
  return (
    <View style={styles.box}>
      <MentionSuggestions handles={composer.suggestions} onPick={composer.pickMention} />
      {composer.unknown.map((handle) => (
        <FollowChip
          key={handle}
          handle={handle}
          requested={requestedHandles.includes(handle)}
          onFollow={onFollow}
        />
      ))}
      <InputRow composer={composer} canSend={trimmed !== ''} onSend={send} onPhoto={onPhoto} />
    </View>
  );
}

type RowProps = {
  composer: ReturnType<typeof useComposer>;
  canSend: boolean;
  onSend: () => void;
  onPhoto: () => void;
};

function InputRow({ composer, canSend, onSend, onPhoto }: RowProps) {
  const { t } = useTranslation('chat');
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('composer.photo')}
        onPress={onPhoto}
        style={styles.iconButton}
      >
        <Icon name="camera" color="textSecondary" />
      </Pressable>
      <TextInput
        accessibilityLabel={t('composer.placeholder')}
        placeholder={t('composer.placeholder')}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        value={composer.text}
        selection={composer.forcedSelection}
        onChangeText={composer.changeText}
        onSelectionChange={(event) => composer.changeSelection(event.nativeEvent.selection)}
        multiline
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('composer.send')}
        accessibilityState={{ disabled: !canSend }}
        onPress={onSend}
        style={[styles.iconButton, styles.send, canSend ? null : styles.sendOff]}
      >
        <Icon name="send" color="onAccent" />
      </Pressable>
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
  iconButton: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  send: { backgroundColor: colors.going },
  sendOff: { opacity: 0.4 },
});
