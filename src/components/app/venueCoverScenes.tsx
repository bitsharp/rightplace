import type { ReactElement } from 'react';

import { colors } from '@/theme/tokens';

import { BarScene } from './scenes/BarScene';
import { ClubScene } from './scenes/ClubScene';
import { GenericScene } from './scenes/GenericScene';
import { LiveScene } from './scenes/LiveScene';
import { RooftopScene } from './scenes/RooftopScene';
import type { SceneProps } from './scenes/shared';

export type CoverScene = 'club' | 'rooftop' | 'bar' | 'live' | 'generic';

// All scenes are comic-style interiors drawn on a 200×150 canvas (see VenueCoverArt).
export const CANVAS = { width: 200, height: 150 } as const;

export const SCENES: Record<CoverScene, (props: SceneProps) => ReactElement> = {
  club: ClubScene,
  rooftop: RooftopScene,
  bar: BarScene,
  live: LiveScene,
  generic: GenericScene,
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
