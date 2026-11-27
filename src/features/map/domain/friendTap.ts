import { friendFacesOf, type FriendVenue } from './mapLayers';

export type FriendTap = { kind: 'profile'; handle: string } | { kind: 'sheet' } | { kind: 'venue' };

// What a tap on a friends-map marker does. A marker is one bitmap, so its faces cannot be tapped one by one:
// one friend means one profile, several friends mean a list to choose from, no usable face means the venue.
export function friendTapOf(venue: FriendVenue | undefined): FriendTap {
  const faces = venue ? friendFacesOf(venue.handles, venue.friendIds) : [];
  const [only] = faces;
  if (!venue || !only) return { kind: 'venue' };
  if (faces.length === 1 && venue.count <= 1) return { kind: 'profile', handle: only.handle };
  return { kind: 'sheet' };
}
