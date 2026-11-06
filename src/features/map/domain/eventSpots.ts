import type { CityEvent } from '@/features/events/api';

export type EventSpotPlacement = { event: CityEvent; lat: number; lng: number };

// ~55 m: enough to keep a creator's night readable next to the venue's own hot spot.
const OFFSET_DEGREES = 0.0005;

// Venue hot spots are drawn at the venue; events sharing the place are fanned out around it.
export function placeEventSpots(
  events: readonly CityEvent[],
  hotSpotVenueIds: ReadonlySet<string>,
): EventSpotPlacement[] {
  const seenPerVenue = new Map<string, number>();
  return events.map((event) => {
    const taken = seenPerVenue.get(event.venueId) ?? 0;
    seenPerVenue.set(event.venueId, taken + 1);
    const slot = taken + (hotSpotVenueIds.has(event.venueId) ? 1 : 0);
    if (slot === 0) return { event, lat: event.lat, lng: event.lng };
    const angle = (slot - 1) * (Math.PI / 2) + Math.PI / 4;
    return {
      event,
      lat: event.lat + Math.sin(angle) * OFFSET_DEGREES,
      lng: event.lng + Math.cos(angle) * OFFSET_DEGREES,
    };
  });
}
