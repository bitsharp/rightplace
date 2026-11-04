import { type Band, bandRank } from '@/features/nights/domain/band';

export const VENUE_KINDS = ['club', 'rooftop', 'bar', 'live', 'other'] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];

export type CityVenue = { id: string; name: string; kind: VenueKind; cityName: string };

export type VenueBands = { goingBand: Band; maybeBand: Band; isSponsored: boolean };

export type VenueListItem = CityVenue & VenueBands;

export type VenueFilter = { kind: VenueKind | null; query: string };

const NO_BANDS: VenueBands = { goingBand: 'pochi', maybeBand: 'pochi', isSponsored: false };

// Bands come from a separate (refetched) query: until they arrive, or for venues outside the top
// results, the honest default is "pochi".
export function mergeVenueBands(
  venues: CityVenue[],
  bands: ReadonlyMap<string, VenueBands>,
): VenueListItem[] {
  return venues.map((venue) => ({ ...venue, ...(bands.get(venue.id) ?? NO_BANDS) }));
}

const turnout = (item: VenueListItem) => bandRank(item.goingBand) + bandRank(item.maybeBand);

// Sponsored first, then turnout (going + maybe), then name.
export function sortVenues(rows: readonly VenueListItem[]): VenueListItem[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.isSponsored) - Number(a.isSponsored) ||
      turnout(b) - turnout(a) ||
      a.name.localeCompare(b.name, 'it'),
  );
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function filterVenues<T extends CityVenue>(rows: readonly T[], filter: VenueFilter): T[] {
  const query = fold(filter.query.trim());
  return rows.filter(
    (row) => (filter.kind === null || row.kind === filter.kind) && fold(row.name).includes(query),
  );
}
