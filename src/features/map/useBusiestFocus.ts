import { useCallback, useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/features/profile/domain/coarsen';
import { useReduceMotion } from '@/features/tour/useReduceMotion';

import type { MapFocus } from './components/MapCanvas';
import { coordsOfVenue } from './domain/ownSpot';
import type { MapVenue } from './domain/mapLayers';

// Time to see the camera land and the ring pulse before the detail opens.
export const OPEN_DELAY_MS = 900;
export const REDUCED_OPEN_DELAY_MS = 300;
// Closer than the "Vai alla mia posizione" framing (0.02).
export const BUSIEST_FOCUS_DELTA = 0.008;

export type HighlightTarget = { venueId: string; point: LatLng; animated: boolean };

// "I più animati": a tap first shows the venue on the map, then opens its detail. Coordinates come from the
// rows of get_city_map (the busiest RPC carries none); without them the detail opens at once.
export function useBusiestFocus(rows: readonly MapVenue[], onOpenVenue: (venueId: string) => void) {
  const reduceMotion = useReduceMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [focus, setFocus] = useState<MapFocus | undefined>(undefined);
  const [highlight, setHighlight] = useState<HighlightTarget | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const select = useCallback(
    (venueId: string) => {
      clearTimeout(timer.current);
      const point = coordsOfVenue(rows, venueId);
      if (!point) {
        setHighlight(null);
        onOpenVenue(venueId);
        return;
      }
      const animated = !reduceMotion;
      setFocus({ point, delta: BUSIEST_FOCUS_DELTA, animated });
      setHighlight({ venueId, point, animated });
      timer.current = setTimeout(
        () => {
          // The ring goes off as the detail covers the map: on return the map is plain again.
          setHighlight(null);
          onOpenVenue(venueId);
        },
        animated ? OPEN_DELAY_MS : REDUCED_OPEN_DELAY_MS,
      );
    },
    [rows, onOpenVenue, reduceMotion],
  );

  return { focus, highlight, select };
}
