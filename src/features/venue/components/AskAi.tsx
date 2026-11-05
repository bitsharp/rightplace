import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { spacing } from '@/theme/tokens';

const QUESTIONS = ['music', 'dress', 'arrive'] as const;

// Placeholder until the AI Edge Function exists (prompt 14): the chips only announce it.
export function AskAi() {
  const { t } = useTranslation('venue');
  const [announced, setAnnounced] = useState(false);
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="display17">{t('ai.title')}</Text>
        <MonoLabel tone="maybe">{t('ai.label')}</MonoLabel>
      </View>
      <View style={styles.chips}>
        {QUESTIONS.map((question) => (
          <Chip
            key={question}
            tone="maybe"
            label={t(`ai.${question}`)}
            selected={false}
            onPress={() => setAnnounced(true)}
          />
        ))}
      </View>
      {announced ? <Toast message={t('ai.soon')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
