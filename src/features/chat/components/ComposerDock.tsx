import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAndroidKeyboardInset } from '@/components/ui/useKeyboardHeight';
import { useKeyboardVisible } from '@/components/ui/useKeyboardVisible';

// The home-indicator inset only applies while the keyboard is down; with it up the composer sits
// right on top of the keys instead of floating a safe-area gap above them. On Android (edge-to-edge,
// window not resized) the dock itself lifts by the keyboard height; on iOS the inset is 0 because
// the screen's KeyboardAvoidingView already does it.
export function ComposerDock({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const keyboardInset = useAndroidKeyboardInset();
  return (
    <View
      testID="composer-dock"
      style={{ paddingBottom: keyboardVisible ? keyboardInset : bottom }}
    >
      {children}
    </View>
  );
}
