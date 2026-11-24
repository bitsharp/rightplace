import type { MapStyleElement } from 'react-native-maps';

import { colors } from '@/theme/tokens';

// Linear mix of two token hex colours: map shades are derived from the tokens, never new hex literals.
function mix(from: string, to: string, amount: number): string {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const part = (offset: number) =>
    Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${part(1)}${part(3)}${part(5)}`.toUpperCase();
}

// Night map of the 24/11 mock-up: near-black ground, glowing violet streets with a clear hierarchy.
// Google Maps (Android) only: iOS Apple Maps cannot be styled and gets the overlay veil instead (MapVignette).
const ROAD_MAJOR = mix(colors.background, colors.primary, 0.85);
const ROAD_ARTERIAL = mix(colors.background, colors.primary, 0.5);
const ROAD_LOCAL = mix(colors.background, colors.primary, 0.26);
const ROAD_LABEL = mix(colors.background, colors.textSecondary, 0.35);

const off = [{ visibility: 'off' }];

export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: colors.mapCanvas }] },
  { elementType: 'labels', stylers: off },
  { elementType: 'labels.icon', stylers: off },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: colors.background }],
  },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: colors.mapCanvas }] },
  { featureType: 'poi', elementType: 'all', stylers: off },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: colors.background }, { visibility: 'on' }],
  },
  { featureType: 'transit', elementType: 'all', stylers: off },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: ROAD_LOCAL }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: off },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: ROAD_LOCAL }, { weight: 0.5 }],
  },
  { featureType: 'road.local', elementType: 'labels', stylers: off },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: ROAD_ARTERIAL }, { weight: 1 }],
  },
  { featureType: 'road.arterial', elementType: 'labels', stylers: off },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: ROAD_MAJOR }, { weight: 2 }],
  },
  { featureType: 'road.highway', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway', elementType: 'labels.icon', stylers: off },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: ROAD_LABEL }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: colors.background }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.background }] },
];

export const mapAppearance = {
  userInterfaceStyle: 'dark',
  customMapStyle: darkMapStyle,
} as const;
