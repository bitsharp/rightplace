import type { LatLng } from '@/features/profile/domain/coarsen';

const EARTH_RADIUS_KM = 6371;
// The position is a ~500 m cell (principle 3): a finer distance would promise precision we do not have.
const DISTANCE_STEP_KM = 0.5;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// From the coarse cell to a venue, to the nearest 500 m and never below it.
export function roundedDistanceKm(cell: LatLng, venue: LatLng): number {
  const steps = Math.round(distanceKm(cell, venue) / DISTANCE_STEP_KM);
  return Math.max(1, steps) * DISTANCE_STEP_KM;
}

export function formatDistanceKm(km: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km);
}
