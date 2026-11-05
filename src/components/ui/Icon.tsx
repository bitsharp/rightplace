import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, type ColorToken } from '@/theme/tokens';

// Glyphs copied from the inline SVGs of design/project/*.dc.html (24×24, stroke icons).
const GLYPHS = {
  map: [
    <Path key="p" d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />,
    <Circle key="c" cx="12" cy="9.5" r="2.5" />,
  ],
  friends: [
    <Circle key="c" cx="9" cy="8" r="3.5" />,
    <Path key="p" d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />,
  ],
  contacts: [
    <Circle key="c" cx="9" cy="8" r="3.5" />,
    <Path key="p" d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />,
    <Path key="q" d="M17 5.5a3 3 0 0 1 0 5.5M21.5 19c0-2.5-1.5-4.3-3.5-5" />,
  ],
  chat: [<Path key="p" d="M4 5h16v11H9l-5 4z" />],
  feed: [
    <Rect key="r" x="3" y="3" width="18" height="18" rx="3" />,
    <Circle key="c" cx="9" cy="9" r="1.5" />,
    <Path key="p" d="M21 15l-5-5L5 21" />,
  ],
  profile: [
    <Circle key="c" cx="12" cy="8" r="4" />,
    <Path key="p" d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />,
  ],
  search: [<Circle key="c" cx="11" cy="11" r="6.5" />, <Path key="p" d="M16 16l4 4" />],
  chevronRight: [<Path key="p" d="M9 6l6 6-6 6" />],
  chevronLeft: [<Path key="p" d="M15 6l-6 6 6 6" />],
  chevronDown: [<Path key="p" d="M5 9l7 7 7-7" />],
  plus: [<Path key="p" d="M12 5v14M5 12h14" />],
  minus: [<Path key="p" d="M5 12h14" />],
  close: [<Path key="p" d="M6 6l12 12M18 6L6 18" />],
  expand: [<Path key="p" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />],
  check: [<Path key="p" d="M5 12l4.5 4.5L19 7" />],
  send: [<Path key="p" d="M5 12h14M13 6l6 6-6 6" />],
  heart: [
    <Path
      key="p"
      d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"
    />,
  ],
  clock: [<Circle key="c" cx="12" cy="12" r="8.5" />, <Path key="p" d="M12 7.5V12l3 2" />],
  bell: [<Path key="p" d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z" />, <Path key="q" d="M10 21h4" />],
  camera: [
    <Rect key="r" x="3" y="6" width="18" height="14" rx="3" />,
    <Circle key="c" cx="12" cy="13" r="3.5" />,
    <Path key="p" d="M8 6l1.5-2h5L16 6" />,
  ],
  eye: [
    <Path key="p" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />,
    <Circle key="c" cx="12" cy="12" r="3" />,
  ],
  eyeOff: [
    <Path key="p" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />,
    <Path key="q" d="M4 4l16 16" />,
  ],
} as const;

export type IconName = keyof typeof GLYPHS;
export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];

type Props = {
  name: IconName;
  size?: number;
  color?: ColorToken;
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({
  name,
  size = 20,
  color = 'text',
  strokeWidth = 1.8,
  filled = false,
}: Props) {
  const stroke = colors[color];
  return (
    <Svg
      testID={`icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? stroke : 'none'}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </Svg>
  );
}
