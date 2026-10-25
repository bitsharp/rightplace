import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export const TAB_NAMES = ['map', 'friends', 'chat', 'feed', 'profile'] as const;
export type TabName = (typeof TAB_NAMES)[number];

// Paths copied from the tab bar in design/project/Mappa.dc.html.
const GLYPHS: Record<TabName, React.JSX.Element> = {
  map: (
    <>
      <Path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  friends: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />
    </>
  ),
  chat: <Path d="M4 5h16v11H9l-5 4z" />,
  feed: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Circle cx="9" cy="9" r="1.5" />
      <Path d="M21 15l-5-5L5 21" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
};

type Props = {
  name: TabName;
  color: ColorValue;
};

export function TabIcon({ name, color }: Props) {
  return (
    <Svg
      testID={`tab-icon-${name}`}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </Svg>
  );
}
