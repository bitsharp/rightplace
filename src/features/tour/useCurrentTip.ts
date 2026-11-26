import { useIsFocused } from 'expo-router';

import { useAnchorRegistry, useAnchorVersion } from './anchorRegistry';
import type { Rect } from './domain/layout';
import { nextVisibleStep, type TourScreen, type TourStepId } from './domain/steps';
import { useTourStore } from './store/tourStore';

export type CurrentTip = { step: TourStepId; anchor: Rect };

// The one tip to show on this screen right now, or null: not in focus, welcome not seen yet,
// everything seen, or the anchor of the next tip is not on screen.
export function useCurrentTip(screen: TourScreen): CurrentTip | null {
  const registry = useAnchorRegistry();
  useAnchorVersion(registry);
  const focused = useIsFocused();
  const welcomeSeen = useTourStore((state) => state.welcomeSeen);
  const seenSteps = useTourStore((state) => state.seenSteps);
  if (!focused || !welcomeSeen) return null;
  const step = nextVisibleStep(screen, seenSteps, (id) => registry.rectOf(id) !== null);
  const anchor = step ? registry.rectOf(step) : null;
  return step && anchor ? { step, anchor } : null;
}
