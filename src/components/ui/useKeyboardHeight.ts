import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

// Keyboard height in dp, from the platform's own events (will-* on iOS, did-* on Android).
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      (event: KeyboardEvent) => setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

// Why Android only: with edge-to-edge (forced from Expo SDK 58) the window is no longer resized for
// the keyboard, so every container with an input at the bottom must lift itself by this amount.
// iOS keeps its own mechanisms (KeyboardAvoidingView, automaticallyAdjustKeyboardInsets): returning
// 0 there guarantees the two strategies never stack.
export function useAndroidKeyboardInset(): number {
  const height = useKeyboardHeight();
  return Platform.OS === 'android' ? height : 0;
}
