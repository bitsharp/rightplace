import { googleMapsPlaceUrl, isGooglePlaceId } from './googleMaps';

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

describe('isGooglePlaceId', () => {
  it('uno spot degli utenti ha un id sintetico, non un luogo di Google', () => {
    expect(isGooglePlaceId('ChIJabc')).toBe(true);
    expect(isGooglePlaceId('spot:3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90')).toBe(false);
  });
});
