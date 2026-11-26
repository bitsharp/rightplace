import { HighlightRing } from '@/components/app/HighlightRing';

import type { HighlightTarget } from '../useBusiestFocus';

import { MapMarker, Z_INDEX } from './MapMarkers';

// Above the hot spots (and their brightness tiers), below "Tu" and the own spot. It sits on the venue's
// coordinates, so it works whether the venue has a hot spot, a typical dot or no marker at all.
export function HighlightMarker({ target }: { target: HighlightTarget }) {
  return (
    <MapMarker
      testID="marker-highlight"
      contentKey={`${target.venueId}:${target.animated}`}
      coordinate={target.point}
      zIndex={Z_INDEX.highlight}
      // A pulsing ring is redrawn every frame: the bitmap must keep being captured (7c72b41 froze it otherwise).
      tracking={target.animated}
    >
      <HighlightRing animated={target.animated} />
    </MapMarker>
  );
}
