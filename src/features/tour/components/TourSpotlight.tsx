import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/theme/tokens';

import { holePath, type Rect, type Size } from '../domain/layout';

type Props = { container: Size; hole: Rect };

// Dark veil over the screen with a rounded hole around the anchor (even-odd fill).
export function TourSpotlight({ container, hole }: Props) {
  return (
    <Svg
      testID="tour-spotlight"
      pointerEvents="none"
      width={container.width}
      height={container.height}
      style={StyleSheet.absoluteFill}
    >
      <Path
        d={holePath(container, hole, radius.button)}
        fill={colors.backdrop}
        fillRule="evenodd"
      />
    </Svg>
  );
}
