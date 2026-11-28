import { OwnSpot } from '@/components/app/OwnSpot';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';

import type { OwnSpot as OwnSpotData } from '../domain/ownSpot';

import { MapMarker, usePhotoWait, Z_INDEX } from './MapMarkers';
import { MarkerTapArea, markerPress } from './MarkerTapArea';

// The face sits just above the venue so it does not hide the hot spot circle under it, and apart from the
// friends' faces, which hang below it.
const OWN_ANCHOR = { x: 0.5, y: 1 } as const;

export type OwnIdentity = { userId: string; handle: string };

type Props = {
  spot: OwnSpotData;
  me: OwnIdentity;
  // Signed photo URLs of the screen's batch; mine is in it, and only I see it.
  urls: Record<string, string>;
  onOpenVenue: (venueId: string) => void;
};

export function OwnMarker({ spot, me, urls, onOpenVenue }: Props) {
  const photos = usePhotoWait([me], urls);
  const open = () => onOpenVenue(spot.venueId);
  return (
    <MapMarker
      testID="marker-own"
      contentKey={`${spot.venueId}:${spot.intent}:${photos.key}`}
      waitingForPhotos={photos.waiting}
      coordinate={spot}
      zIndex={Z_INDEX.own}
      anchor={OWN_ANCHOR}
      onPress={markerPress(open)}
    >
      <MarkerTapArea testID="marker-own" onPress={open}>
        <OwnSpot
          intent={spot.intent}
          initial={me.handle.charAt(0)}
          photo={avatarPhotoFor(urls, me.userId)}
          onPhotoSettled={() => photos.onFaceSettled(me.userId)}
        />
      </MarkerTapArea>
    </MapMarker>
  );
}
