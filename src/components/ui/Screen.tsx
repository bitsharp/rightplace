import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
};

// Edges exclude the bottom on purpose: the bottom inset becomes padding of the content, so the last
// element can scroll clear of the home indicator. Keyboard: one strategy only (the ScrollView
// insets itself on iOS, the window resizes on Android), so the focused field is never covered.
export function Screen({ children, scroll = false, testID }: Props) {
  const { bottom } = useSafeAreaInsets();
  const content = [styles.content, { paddingBottom: bottom + spacing.xxl }];
  return (
    <SafeAreaView testID={testID} style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          testID="screen-scroll"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={content}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  fill: { flex: 1 },
});
