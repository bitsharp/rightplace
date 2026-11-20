import type { LatLng } from '@/features/profile/domain/coarsen';

export type CityPoint = LatLng & { slug: string };

// "auto" = follow the phone (coarse cell) or the profile; any other value is the slug the user picked.
export type CityPreference = string;
export const AUTO_CITY = 'auto';

const EARTH_RADIUS_KM = 6371;
// Far enough to cover a metro area, near enough not to call a different country "the same city".
export const MAX_CITY_DISTANCE_KM = 60;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Takes the ~500 m cell (principle 3), never a precise position: the city is all it can reveal.
export function nearestActiveCity(
  cell: LatLng,
  cities: readonly CityPoint[],
  maxKm: number = MAX_CITY_DISTANCE_KM,
): string | null {
  let best: { slug: string; km: number } | null = null;
  for (const city of cities) {
    const km = distanceKm(cell, city);
    if (km <= maxKm && (!best || km < best.km)) best = { slug: city.slug, km };
  }
  return best?.slug ?? null;
}

type ResolveInput = {
  preference: CityPreference;
  detected: string | null;
  profileCity: string | null;
  fallback: string;
  // null while the list of active cities is still loading: the choice is trusted meanwhile.
  activeSlugs: readonly string[] | null;
};

export function resolveCity({
  preference,
  detected,
  profileCity,
  fallback,
  activeSlugs,
}: ResolveInput): string {
  const explicit = preference !== AUTO_CITY && (!activeSlugs || activeSlugs.includes(preference));
  if (explicit) return preference;
  return detected ?? profileCity ?? fallback;
}
