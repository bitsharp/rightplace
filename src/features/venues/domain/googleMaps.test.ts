import { googleMapsPlaceUrl, isGooglePlaceId } from './googleMaps';

const BASE = 'https://www.google.com/maps/search/?api=1';

describe('googleMapsPlaceUrl', () => {
  it('usa il formato ufficiale Maps URLs con query e query_place_id', () => {
    expect(
      googleMapsPlaceUrl({
        placeId: 'ChIJabc123',
        name: 'Arena Club',
        address: 'Via Test 1, Milano',
        lat: 45.46,
        lng: 9.19,
      }),
    ).toBe(`${BASE}&query=Arena%20Club%2C%20Via%20Test%201%2C%20Milano&query_place_id=ChIJabc123`);
  });

  it('codifica caratteri speciali e accentati nel nome e nell’indirizzo', () => {
    const url = googleMapsPlaceUrl({
      placeId: 'a b&c',
      name: 'Caffè & Più #1',
      address: 'Via dell’Università 5',
      lat: 45.46,
      lng: 9.19,
    });
    expect(url).toBe(
      `${BASE}&query=${encodeURIComponent('Caffè & Più #1, Via dell’Università 5')}&query_place_id=a%20b%26c`,
    );
    expect(url).toContain('Caff%C3%A8%20%26%20Pi%C3%B9%20%231');
  });

  it('senza indirizzo la query è il solo nome', () => {
    expect(
      googleMapsPlaceUrl({ placeId: 'ChIJabc', name: 'Rooftop', address: null, lat: 1, lng: 2 }),
    ).toBe(`${BASE}&query=Rooftop&query_place_id=ChIJabc`);
  });

  it('senza nome né indirizzo la query sono le coordinate', () => {
    expect(
      googleMapsPlaceUrl({ placeId: 'ChIJabc', name: '', address: null, lat: 45.46, lng: 9.19 }),
    ).toBe(`${BASE}&query=45.46%2C9.19&query_place_id=ChIJabc`);
  });

  it('uno spot degli utenti non ha place id: cerca solo le coordinate', () => {
    const url = googleMapsPlaceUrl({
      placeId: 'spot:3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90',
      name: 'Il mio spot',
      address: null,
      lat: 45.46,
      lng: 9.19,
    });
    expect(url).toBe(`${BASE}&query=45.46,9.19`);
    expect(url).not.toContain('place_id');
    expect(url).not.toContain('spot');
  });
});

describe('isGooglePlaceId', () => {
  it('uno spot degli utenti ha un id sintetico, non un luogo di Google', () => {
    expect(isGooglePlaceId('ChIJabc')).toBe(true);
    expect(isGooglePlaceId('spot:3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90')).toBe(false);
  });
});
