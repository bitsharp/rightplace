import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
};

// Edges exclude the bottom on purpose: the bottom inset becomes padding of the content, so the last
// element can scroll clear of the home indicator. Keyboard: the library's KeyboardAwareScrollView is the
// single strategy on iOS and Android (edge-to-edge never resizes the window, so the native
// automaticallyAdjustKeyboardInsets / adjustResize do not apply); it scrolls the focused field into view.
export function Screen({ children, scroll = false, testID }: Props) {
  const { bottom } = useSafeAreaInsets();
  const content = [styles.content, { paddingBottom: bottom + spacing.xxl }];
  return (
    <SafeAreaView testID={testID} style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <KeyboardAwareScrollView
          testID="screen-scroll"
          bottomOffset={spacing.xl}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={content}
        >
          {children}
        </KeyboardAwareScrollView>
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
