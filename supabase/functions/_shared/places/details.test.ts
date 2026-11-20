import { assertEquals } from 'jsr:@std/assert@1';
import { PLACES_FIELD_MASK } from './textSearch.ts';
import {
  buildDetailsRequest,
  buildSelectionDetailsRequest,
  DETAILS_FIELD_MASK,
  detailsToRow,
  isRealPlaceId,
  parseSelectionInput,
  SELECTION_FIELD_MASK,
  selectionToRow,
  shouldRefresh,
} from './details.ts';

const now = new Date('2026-11-04T12:00:00Z');

Deno.test('shouldRefresh: mai sincronizzato → aggiorna', () => {
  assertEquals(shouldRefresh(null, now), true);
});

Deno.test('shouldRefresh: sincronizzato meno di 30 giorni fa → non chiama Google', () => {
  assertEquals(shouldRefresh(new Date('2026-10-10T12:00:01Z'), now), false);
});

Deno.test('shouldRefresh: sincronizzato 30 giorni fa o più → aggiorna', () => {
  assertEquals(shouldRefresh(new Date('2026-10-05T12:00:00Z'), now), true);
  assertEquals(shouldRefresh(new Date('2026-01-01T00:00:00Z'), now), true);
});

Deno.test('isRealPlaceId esclude i locali demo', () => {
  assertEquals(isRealPlaceId('demo-01'), false);
  assertEquals(isRealPlaceId('ChIJxxxx'), true);
});

Deno.test('isRealPlaceId esclude gli spot degli utenti (id sintetico)', () => {
  assertEquals(isRealPlaceId('spot:3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90'), false);
});

Deno.test('la richiesta Place Details è una GET con field mask minima', () => {
  const { url, init } = buildDetailsRequest('abc', 'chiave', 'it');
  assertEquals(url, 'https://places.googleapis.com/v1/places/abc?languageCode=it');
  assertEquals(init.method, 'GET');
  const headers = init.headers as Record<string, string>;
  assertEquals(headers['X-Goog-Api-Key'], 'chiave');
  assertEquals(headers['X-Goog-FieldMask'], DETAILS_FIELD_MASK);
  assertEquals(
    DETAILS_FIELD_MASK,
    'id,displayName,location,formattedAddress,regularOpeningHours,websiteUri',
  );
});

Deno.test('detailsToRow mantiene il tipo già salvato del locale', () => {
  const row = detailsToRow(
    {
      id: 'abc',
      displayName: { text: 'Nome' },
      location: { latitude: 1, longitude: 2 },
      formattedAddress: 'Via X',
    },
    'rooftop',
  );
  assertEquals(row?.kind, 'rooftop');
  assertEquals(row?.address, 'Via X');
  assertEquals(detailsToRow({ id: 'abc' }, 'bar'), null);
});

Deno.test(
  'websiteUri resta fuori dalla Text Search e dalla selezione Pro (fascia più cara)',
  () => {
    assertEquals(PLACES_FIELD_MASK.includes('websiteUri'), false);
    assertEquals(SELECTION_FIELD_MASK.includes('websiteUri'), false);
  },
);

const detailsPlace = (extra: Record<string, unknown>) => ({
  id: 'abc',
  displayName: { text: 'Nome' },
  location: { latitude: 1, longitude: 2 },
  ...extra,
});

Deno.test('detailsToRow porta il sito web http(s) del locale', () => {
  assertEquals(
    detailsToRow(detailsPlace({ websiteUri: 'https://www.locale.it/' }), 'bar')?.website_uri,
    'https://www.locale.it/',
  );
  assertEquals(
    detailsToRow(detailsPlace({ websiteUri: 'http://locale.it' }), 'bar')?.website_uri,
    'http://locale.it',
  );
});

Deno.test('detailsToRow: sito assente, non testo o con schema diverso → null', () => {
  for (const websiteUri of [
    undefined,
    null,
    5,
    '',
    'javascript:alert(1)',
    'tel:+39021234',
    'www.x.it',
  ]) {
    assertEquals(detailsToRow(detailsPlace({ websiteUri }), 'bar')?.website_uri, null);
  }
});

const SESSION = '3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90';

Deno.test('la selezione usa Place Details Pro: field mask esatta, senza orari', () => {
  assertEquals(SELECTION_FIELD_MASK, 'id,displayName,formattedAddress,location,types,primaryType');
  const { url, init } = buildSelectionDetailsRequest('abc', 'chiave', SESSION, 'en');
  assertEquals(
    url,
    `https://places.googleapis.com/v1/places/abc?languageCode=en&sessionToken=${SESSION}`,
  );
  assertEquals(init.method, 'GET');
  const headers = init.headers as Record<string, string>;
  assertEquals(headers['X-Goog-FieldMask'], SELECTION_FIELD_MASK);
  assertEquals(headers['X-Goog-FieldMask'].includes('regularOpeningHours'), false);
  assertEquals(headers['X-Goog-Api-Key'], 'chiave');
});

Deno.test('parseSelectionInput valida place_id, session_token e città', () => {
  const ok = { place_id: 'ChIJabc', session_token: SESSION, city_slug: 'milano', language: 'en' };
  assertEquals(parseSelectionInput(ok), {
    placeId: 'ChIJabc',
    sessionToken: SESSION,
    citySlug: 'milano',
    language: 'en',
  });
  assertEquals(parseSelectionInput({ ...ok, language: undefined })?.language, 'it');
  assertEquals(parseSelectionInput({ ...ok, session_token: 'x' }), null);
  assertEquals(parseSelectionInput({ ...ok, place_id: '' }), null);
  assertEquals(parseSelectionInput({ ...ok, place_id: 'spot:abc' }), null);
  assertEquals(parseSelectionInput({ ...ok, place_id: 'demo-01' }), null);
  assertEquals(parseSelectionInput({ ...ok, city_slug: '' }), null);
  assertEquals(parseSelectionInput({ ...ok, language: 'fr' }), null);
});

Deno.test('selectionToRow: un esercizio passa kind mappato e types', () => {
  const row = selectionToRow({
    id: 'abc',
    displayName: { text: 'Magazzini Generali' },
    formattedAddress: 'Via Pietrasanta 14, Milano',
    location: { latitude: 45.45, longitude: 9.2 },
    types: ['night_club', 'establishment', 'point_of_interest'],
    primaryType: 'night_club',
  });
  assertEquals(row, {
    google_place_id: 'abc',
    name: 'Magazzini Generali',
    kind: 'club',
    lat: 45.45,
    lng: 9.2,
    address: 'Via Pietrasanta 14, Milano',
    types: ['night_club', 'establishment', 'point_of_interest'],
  });
});

Deno.test('selectionToRow: un indirizzo passa i suoi types e kind other (il DB lo fa spot)', () => {
  const row = selectionToRow({
    id: 'addr',
    displayName: { text: 'Via Torino 20' },
    formattedAddress: 'Via Torino 20, 20123 Milano MI',
    location: { latitude: 45.4642, longitude: 9.19 },
    types: ['street_address'],
  });
  assertEquals(row?.kind, 'other');
  assertEquals(row?.types, ['street_address']);
});

Deno.test('selectionToRow: senza id, nome o coordinate è null', () => {
  assertEquals(selectionToRow({ id: 'a' }), null);
  assertEquals(selectionToRow(null), null);
});
