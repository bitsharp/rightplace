import type { ReactElement } from 'react';
import { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type CoverScene = 'club' | 'rooftop' | 'bar' | 'live' | 'generic';

// All scenes are drawn on a 200×150 canvas, the bottom third being the "floor" (see VenueCoverArt).
export const CANVAS = { width: 200, height: 150 } as const;

const ICON_STROKE = { stroke: colors.text, strokeWidth: 2, fill: 'none', opacity: 0.85 } as const;

// Light beams from the ceiling onto a dance floor, with a disco ball.
function Club() {
  return (
    <G>
      <Polygon points="40,0 60,0 90,112 20,112" fill={colors.primary} opacity={0.22} />
      <Polygon points="100,0 120,0 160,112 90,112" fill={colors.secondary} opacity={0.18} />
      <Polygon points="150,0 170,0 190,112 140,112" fill={colors.primary} opacity={0.16} />
      <Rect x="0" y="112" width="200" height="38" fill={colors.surface} />
      <Rect x="20" y="118" width="40" height="6" rx="3" fill={colors.goingBorder} />
      <Rect x="80" y="118" width="40" height="6" rx="3" fill={colors.maybeBorder} />
      <Rect x="140" y="118" width="40" height="6" rx="3" fill={colors.goingBorder} />
      <G {...ICON_STROKE}>
        <Path d="M100 0v22" />
        <Circle cx="100" cy="36" r="14" />
        <Path d="M86 36h28M100 22v28M90 27c6 4 14 4 20 0M90 45c6-4 14-4 20 0" />
      </G>
    </G>
  );
}

// Skyline with lit windows and a moon.
function Rooftop() {
  return (
    <G>
      <Circle cx="150" cy="34" r="16" fill={colors.text} opacity={0.85} />
      <Circle cx="158" cy="30" r="14" fill={colors.background} opacity={0.9} />
      <Rect x="10" y="70" width="30" height="80" fill={colors.surface} />
      <Rect x="46" y="48" width="36" height="102" fill={colors.surface} />
      <Rect x="88" y="82" width="28" height="68" fill={colors.surface} />
      <Rect x="122" y="60" width="34" height="90" fill={colors.surface} />
      <Rect x="162" y="90" width="30" height="60" fill={colors.surface} />
      <Rect x="54" y="58" width="6" height="8" fill={colors.secondary} opacity={0.8} />
      <Rect x="68" y="76" width="6" height="8" fill={colors.secondary} opacity={0.6} />
      <Rect x="130" y="72" width="6" height="8" fill={colors.primary} opacity={0.8} />
      <Rect x="142" y="92" width="6" height="8" fill={colors.secondary} opacity={0.6} />
      <Rect x="0" y="128" width="200" height="22" fill={colors.border} opacity={0.7} />
    </G>
  );
}

// Bar counter with bottles on a shelf and two glasses.
function Bar() {
  return (
    <G>
      <Rect x="20" y="40" width="160" height="4" rx="2" fill={colors.border} />
      <Rect x="36" y="22" width="8" height="18" rx="3" fill={colors.primary} opacity={0.5} />
      <Rect x="62" y="26" width="8" height="14" rx="3" fill={colors.secondary} opacity={0.5} />
      <Rect x="130" y="20" width="8" height="20" rx="3" fill={colors.secondary} opacity={0.5} />
      <Rect x="156" y="26" width="8" height="14" rx="3" fill={colors.primary} opacity={0.5} />
      <Rect x="0" y="104" width="200" height="46" fill={colors.surface} />
      <Rect x="0" y="100" width="200" height="6" fill={colors.border} />
      <Path d="M52 70h28l-14 24z" fill={colors.maybeSoft} stroke={colors.secondary} />
      <Path d="M66 94v8M58 102h16" stroke={colors.secondary} strokeWidth={2} />
      <Path d="M122 74h22l-3 26h-16z" fill={colors.goingSoft} stroke={colors.primary} />
    </G>
  );
}

// Stage with spotlights and a microphone stand.
function Live() {
  return (
    <G>
      <Polygon points="30,0 44,0 84,108 50,108" fill={colors.secondary} opacity={0.2} />
      <Polygon points="156,0 170,0 150,108 116,108" fill={colors.primary} opacity={0.22} />
      <Rect x="20" y="108" width="160" height="14" fill={colors.border} />
      <Rect x="0" y="122" width="200" height="28" fill={colors.surface} />
      <G stroke={colors.text} strokeWidth={2} fill="none" opacity={0.85}>
        <Rect x="94" y="48" width="12" height="20" rx="6" />
        <Path d="M88 62a12 12 0 0 0 24 0M100 74v34M90 108h20" />
      </G>
    </G>
  );
}

// City lights: a row of lit windows and a few bokeh dots.
function Generic() {
  return (
    <G>
      <Circle cx="40" cy="40" r="10" fill={colors.primary} opacity={0.25} />
      <Circle cx="96" cy="26" r="7" fill={colors.secondary} opacity={0.25} />
      <Circle cx="150" cy="48" r="12" fill={colors.primary} opacity={0.2} />
      <Circle cx="120" cy="72" r="6" fill={colors.secondary} opacity={0.3} />
      <Rect x="0" y="104" width="200" height="46" fill={colors.surface} />
      <Rect x="16" y="86" width="26" height="64" fill={colors.surface} />
      <Rect x="130" y="80" width="30" height="70" fill={colors.surface} />
      <Rect x="22" y="94" width="5" height="7" fill={colors.secondary} opacity={0.7} />
      <Rect x="138" y="90" width="5" height="7" fill={colors.primary} opacity={0.7} />
      <Rect x="148" y="108" width="5" height="7" fill={colors.secondary} opacity={0.6} />
    </G>
  );
}

export const SCENES: Record<CoverScene, () => ReactElement> = {
  club: Club,
  rooftop: Rooftop,
  bar: Bar,
  live: Live,
  generic: Generic,
};

export function sceneForKind(kind: string): CoverScene {
  return kind === 'club' || kind === 'rooftop' || kind === 'bar' || kind === 'live'
    ? kind
    : 'generic';
}

// The accent of the sky: violet for the dancing kinds, cyan for the quieter ones.
export const SKY_ACCENT: Record<CoverScene, string> = {
  club: colors.primary,
  rooftop: colors.secondary,
  bar: colors.primary,
  live: colors.secondary,
  generic: colors.primary,
};
