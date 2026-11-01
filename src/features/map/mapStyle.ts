import type { MapStyleElement } from 'react-native-maps';

import { colors } from '@/theme/tokens';

// Google Maps (Android) dark style matching the mock-up palette; iOS Apple Maps uses userInterfaceStyle.
// Hex values below are map-only shades with no UI counterpart, so they live here (allowed by prompt 03).
const ROAD = '#23233A';
const ROAD_MINOR = '#1B1B2C';
const WATER = '#0D1424';
const PARK = '#121A1A';

export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: colors.mapCanvas }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.background }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: colors.border }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: colors.mapCanvas }] },
  { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: PARK }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: ROAD_MINOR }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: ROAD }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: ROAD }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: ROAD_MINOR }] },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.maybe }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: WATER }] },
];

export const mapAppearance = {
  userInterfaceStyle: 'dark',
  customMapStyle: darkMapStyle,
} as const;
