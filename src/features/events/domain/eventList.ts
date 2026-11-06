import { filterVenues, type VenueKind } from '@/features/venues/domain/venueList';

import type { CityEvent } from '../api';

export type EventFilter = { kind: VenueKind | null; query: string };

const matching = (
  events: readonly CityEvent[],
  filter: EventFilter,
  text: (e: CityEvent) => string,
) =>
  filterVenues(
    events.map((event) => ({
      id: event.eventId,
      name: text(event),
      kind: event.venueKind,
      cityName: '',
    })),
    filter,
  ).map((row) => row.id);

// Search matches the event's name or its venue's name, like the venue list does (accents and case ignored).
export function filterEvents(events: readonly CityEvent[], filter: EventFilter): CityEvent[] {
  const wanted = new Set([
    ...matching(events, filter, (event) => event.name),
    ...matching(events, filter, (event) => event.venueName),
  ]);
  return events.filter((event) => wanted.has(event.eventId));
}
