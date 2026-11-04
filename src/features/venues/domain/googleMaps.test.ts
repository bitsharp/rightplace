import { googleMapsPlaceUrl } from './googleMaps';

describe('googleMapsPlaceUrl', () => {
  it('costruisce il link "Apri in Google Maps" dal place_id', () => {
    expect(googleMapsPlaceUrl('ChIJabc123')).toBe(
      'https://www.google.com/maps/place/?q=place_id:ChIJabc123',
    );
  });

  it('codifica i caratteri speciali del place_id', () => {
    expect(googleMapsPlaceUrl('a b&c')).toBe(
      'https://www.google.com/maps/place/?q=place_id:a%20b%26c',
    );
  });
});
