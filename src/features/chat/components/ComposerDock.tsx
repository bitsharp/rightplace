import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/components/ui/useKeyboardVisible';

// The home-indicator inset only applies while the keyboard is down; with it up the composer sits
// right on top of the keys instead of floating a safe-area gap above them.
export function ComposerDock({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  return (
    <View testID="composer-dock" style={{ paddingBottom: keyboardVisible ? 0 : bottom }}>
      {children}
    </View>
  );
}
