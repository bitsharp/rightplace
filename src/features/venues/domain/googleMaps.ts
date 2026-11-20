type PlaceLinkInput = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

// "Apri in Google Maps" link required next to Places data (docs/places-terms.md). Official "Maps URLs"
// format: `query` is mandatory, `query_place_id` pins the exact place. The undocumented
// `/maps/place/?q=place_id:` form is ignored by the Google Maps apps.
export function googleMapsPlaceUrl({ placeId, name, address, lat, lng }: PlaceLinkInput): string {
  const base = 'https://www.google.com/maps/search/?api=1';
  if (!isGooglePlaceId(placeId)) return `${base}&query=${lat},${lng}`;
  const text = [name, address].filter(Boolean).join(', ');
  const query = encodeURIComponent(text || `${lat},${lng}`);
  return `${base}&query=${query}&query_place_id=${encodeURIComponent(placeId)}`;
}

// User spots carry a synthetic id ('spot:<uuid>'): there is no Google place behind them, so no attribution,
// no "Open in Google Maps" link and no place_id in deep links.
export function isGooglePlaceId(placeId: string): boolean {
  return !placeId.startsWith('spot:');
}
