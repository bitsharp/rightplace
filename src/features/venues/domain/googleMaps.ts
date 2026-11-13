// "Apri in Google Maps" link required next to Places data (docs/places-terms.md).
export function googleMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

// User spots carry a synthetic id ('spot:<uuid>'): there is no Google place behind them, so no attribution,
// no "Open in Google Maps" link and no place_id in deep links.
export function isGooglePlaceId(placeId: string): boolean {
  return !placeId.startsWith('spot:');
}
