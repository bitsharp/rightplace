// "Apri in Google Maps" link required next to Places data (docs/places-terms.md).
export function googleMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}
