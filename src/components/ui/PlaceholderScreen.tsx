import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

import { Text } from './Text';

type Props = {
  title: string;
  children?: ReactNode;
};

// Temporary screen shell until each feature prompt replaces it.
export function PlaceholderScreen({ title, children }: Props) {
  const { t } = useTranslation('common');
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="display24" style={styles.center}>
          {title}
        </Text>
        <Text color="textSecondary" style={styles.center}>
          {t('placeholder.body')}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  center: { textAlign: 'center' },
});
