import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
};

export function Screen({ children, scroll = false, testID }: Props) {
  return (
    <SafeAreaView testID={testID} style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView testID="screen-scroll" contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  fill: { flex: 1 },
});
