import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Divider } from '@/components/ui/Divider';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

export type SectionName =
  | 'colors'
  | 'typography'
  | 'buttons'
  | 'selection'
  | 'fields'
  | 'states'
  | 'map'
  | 'social'
  | 'creator'
  | 'navigation';

export function Section({ name, children }: { name: SectionName; children: ReactNode }) {
  const { t } = useTranslation('dev');
  return (
    <View style={styles.section}>
      <Divider />
      <Text accessibilityRole="header" variant="display17">
        {t(`sections.${name}`)}
      </Text>
      {children}
    </View>
  );
}

export const Row = ({ children }: { children: ReactNode }) => (
  <View style={styles.row}>{children}</View>
);

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm + 2 },
});
