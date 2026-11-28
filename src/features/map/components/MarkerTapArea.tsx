import { Platform, Pressable } from 'react-native';
import type { ReactNode } from 'react';

type Props = { testID: string; onPress: () => void; children: ReactNode };

// iOS (Apple Maps): the Marker's own onPress depends on the annotation being selected and misses taps on
// the faces, so one Pressable around the whole content (circle + faces) takes the tap. Android draws the
// children as a bitmap that cannot be touched: there the Marker's onPress is the only path (see markerPress).
export function MarkerTapArea({ testID, onPress, children }: Props) {
  if (Platform.OS !== 'ios') return children;
  return (
    <Pressable testID={`tap-${testID}`} accessible={false} onPress={onPress}>
      {children}
    </Pressable>
  );
}

// The Marker's onPress, on Android only: iOS goes through MarkerTapArea, never both (no double open).
export const markerPress = (onPress: () => void) =>
  Platform.OS === 'android' ? onPress : undefined;
