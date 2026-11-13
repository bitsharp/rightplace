import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { spacing } from '@/theme/tokens';

type Props = { handles: string[]; onPick: (handle: string) => void };

// Handles come only from people visible in this room or followed by me (principle 6): the label says so.
export function MentionSuggestions({ handles, onPick }: Props) {
  const { t } = useTranslation('chat');
  if (handles.length === 0) return null;
  return (
    <View style={styles.box}>
      <MonoLabel tone="maybe">{t('composer.mentionHint')}</MonoLabel>
      <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
        {handles.map((handle) => (
          <Chip
            key={handle}
            label={`@${handle}`}
            selected={false}
            tone="maybe"
            onPress={() => onPick(handle)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  row: { gap: spacing.sm },
});
