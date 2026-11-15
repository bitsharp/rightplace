import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

import { useAndroidKeyboardInset } from './useKeyboardHeight';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
};

// Edges exclude the bottom on purpose: the bottom inset becomes padding of the content, so the last
// element can scroll clear of the home indicator. Keyboard: one strategy per platform, never both.
// iOS: the ScrollView insets itself. Android (edge-to-edge): the window is not resized, so the
// screen lifts its own bottom by the keyboard height, and the focused field scrolls in the rest.
export function Screen({ children, scroll = false, testID }: Props) {
  const { bottom } = useSafeAreaInsets();
  const keyboardInset = useAndroidKeyboardInset();
  // With the keyboard up, the home-indicator inset is already under the keys.
  const content = [
    styles.content,
    { paddingBottom: (keyboardInset > 0 ? 0 : bottom) + spacing.xxl },
  ];
  return (
    <SafeAreaView
      testID={testID}
      style={[styles.screen, { paddingBottom: keyboardInset }]}
      edges={['top', 'left', 'right']}
    >
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
