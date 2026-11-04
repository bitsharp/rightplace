import { assertEquals } from 'jsr:@std/assert@1';
import {
  buildTextSearchRequest,
  languageFor,
  mapKind,
  PLACES_FIELD_MASK,
  queriesForCity,
  toVenueRows,
} from './textSearch.ts';
import type { SyncCity } from './types.ts';

const center = { lat: 45.4642, lng: 9.19 };

Deno.test('la field mask contiene solo i campi minimi', () => {
  assertEquals(
    PLACES_FIELD_MASK,
    'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.regularOpeningHours',
  );
});

const milano: SyncCity = {
  slug: 'milano',
  name: 'Milano',
  country: 'IT',
  center: { lat: 45.4642, lng: 9.19 },
  radiusM: 8000,
  areas: ['Navigli', 'Isola', 'Brera', 'Porta Venezia', 'Lambrate', 'Corso Como'],
};

const lasPalmas: SyncCity = {
  slug: 'las-palmas',
  name: 'Las Palmas',
  country: 'ES',
  center: { lat: 28.1235, lng: -15.4134 },
  radiusM: 6000,
  areas: ['Las Canteras', 'Santa Catalina', 'Vegueta', 'Triana', 'Mesa y López'],
};

Deno.test('le prime 4 query sono generiche, una per tipo, nella lingua del paese (IT)', () => {
  const queries = queriesForCity(milano, 10).slice(0, 4);
  assertEquals(
    queries.map((q) => [q.kind, q.textQuery]),
    [
      ['club', 'discoteca Milano'],
      ['bar', 'cocktail bar Milano'],
      ['rooftop', 'rooftop bar Milano'],
      ['live', 'musica dal vivo Milano'],
    ],
  );
});

Deno.test('dopo le generiche vengono le query per area, fino al tetto richiesto', () => {
  const queries = queriesForCity(milano, 10);
  assertEquals(queries.length, 10);
  const areaText = queries
    .slice(4)
    .map((q) => q.textQuery)
    .join(' | ');
  for (const area of milano.areas) assertEquals(areaText.includes(area), true, area);
  assertEquals(queriesForCity(milano, 6).length, 6);
  assertEquals(queriesForCity(milano, 20).length, 10);
});

Deno.test('il tetto taglia anche le query generiche e non va mai oltre 20', () => {
  assertEquals(queriesForCity(milano, 2).length, 2);
  const manyAreas = { ...milano, areas: Array.from({ length: 40 }, (_, i) => `Zona ${i}`) };
  assertEquals(queriesForCity(manyAreas, 20).length, 20);
  assertEquals(queriesForCity(manyAreas, 999).length, 20);
});

Deno.test('una città spagnola usa query in spagnolo e le sue aree, non quelle di Milano', () => {
  const queries = queriesForCity(lasPalmas, 10);
  assertEquals(
    queries.slice(0, 4).map((q) => q.textQuery),
    [
      'discoteca Las Palmas',
      'bar de copas Las Palmas',
      'azotea bar Las Palmas',
      'música en directo Las Palmas',
    ],
  );
  const text = queries.map((q) => q.textQuery).join(' | ');
  assertEquals(text.includes('Vegueta'), true);
  assertEquals(text.includes('Navigli'), false);
  assertEquals(languageFor('ES'), 'es');
  assertEquals(languageFor('IT'), 'it');
  assertEquals(languageFor('FR'), 'en');
});

Deno.test('una città senza aree ha solo le 4 query generiche', () => {
  assertEquals(queriesForCity({ ...milano, areas: [] }, 10).length, 4);
});

Deno.test('la richiesta Text Search ha endpoint, header, body, raggio e lingua giusti', () => {
  const { url, init } = buildTextSearchRequest(
    { kind: 'club', textQuery: 'discoteca Las Palmas', includedType: 'night_club' },
    lasPalmas.center,
    'chiave-finta',
    lasPalmas.radiusM,
    'es',
  );
  assertEquals(url, 'https://places.googleapis.com/v1/places:searchText');
  assertEquals(init.method, 'POST');
  const headers = init.headers as Record<string, string>;
  assertEquals(headers['X-Goog-Api-Key'], 'chiave-finta');
  assertEquals(headers['X-Goog-FieldMask'], PLACES_FIELD_MASK);
  assertEquals(JSON.parse(String(init.body)), {
    textQuery: 'discoteca Las Palmas',
    includedType: 'night_club',
    locationBias: { circle: { center: { latitude: 28.1235, longitude: -15.4134 }, radius: 6000 } },
    languageCode: 'es',
    pageSize: 20,
  });
});

Deno.test('senza includedType il body non lo contiene', () => {
  const { init } = buildTextSearchRequest(
    { kind: 'rooftop', textQuery: 'rooftop bar' },
    center,
    'k',
    8000,
    'en',
  );
  assertEquals('includedType' in JSON.parse(String(init.body)), false);
});

Deno.test('mapKind traduce il primaryType di Google nei nostri tipi', () => {
  assertEquals(mapKind('night_club', 'bar'), 'club');
  for (const type of ['bar', 'cocktail_bar', 'wine_bar', 'pub', 'lounge_bar']) {
    assertEquals(mapKind(type, 'club'), 'bar', type);
  }
  assertEquals(mapKind('live_music_venue', 'bar'), 'live');
  assertEquals(mapKind('concert_hall', 'bar'), 'live');
});

Deno.test(
  'una query rooftop dà sempre rooftop; un tipo sconosciuto usa il tipo della query',
  () => {
    assertEquals(mapKind('night_club', 'rooftop'), 'rooftop');
    assertEquals(mapKind('restaurant', 'live'), 'live');
    assertEquals(mapKind(undefined, 'club'), 'club');
  },
);

const place = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  displayName: { text: `Nome ${id}`, languageCode: 'it' },
  location: { latitude: 45.1, longitude: 9.2 },
  formattedAddress: `Via ${id}`,
  primaryType: 'night_club',
  ...extra,
});

Deno.test('toVenueRows produce le righe per sync_places_venues', () => {
  const rows = toVenueRows(
    { places: [place('a', { regularOpeningHours: { weekdayDescriptions: ['lun'] } })] },
    'club',
  );
  assertEquals(rows, [
    {
      google_place_id: 'a',
      name: 'Nome a',
      kind: 'club',
      lat: 45.1,
      lng: 9.2,
      address: 'Via a',
      opening_hours: { weekdayDescriptions: ['lun'] },
    },
  ]);
});

Deno.test('toVenueRows scarta i luoghi incompleti e deduplica per place_id', () => {
  const rows = toVenueRows(
    {
      places: [
        place('a'),
        place('a'),
        { ...place('senza-nome'), displayName: undefined },
        { ...place('senza-posizione'), location: undefined },
        { displayName: { text: 'senza id' }, location: { latitude: 1, longitude: 2 } },
        { ...place('lat-stringa'), location: { latitude: '1', longitude: 2 } },
      ],
    },
    'bar',
  );
  assertEquals(
    rows.map((r) => r.google_place_id),
    ['a'],
  );
});

Deno.test('toVenueRows accetta una risposta vuota o malformata', () => {
  assertEquals(toVenueRows({}, 'bar'), []);
  assertEquals(toVenueRows(null, 'bar'), []);
  assertEquals(toVenueRows({ places: 'x' }, 'bar'), []);
});
