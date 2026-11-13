import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  AUTOCOMPLETE_URL,
  buildAutocompleteRequest,
  parseSearchInput,
  requireApiKey,
  toSuggestions,
} from './search.ts';

const SESSION = '3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90';
const valid = { input: 'via torino', sessionToken: SESSION, citySlug: 'milano', language: 'it' };

Deno.test('parseSearchInput accetta una richiesta valida e toglie gli spazi', () => {
  assertEquals(parseSearchInput({ ...valid, input: '  via torino  ' }), {
    input: 'via torino',
    sessionToken: SESSION,
    citySlug: 'milano',
    language: 'it',
  });
});

Deno.test(
  'parseSearchInput ignora un eventuale sessionStart: la quota non dipende dal client',
  () => {
    assertEquals(
      'sessionStart' in (parseSearchInput({ ...valid, sessionStart: true }) ?? {}),
      false,
    );
  },
);

Deno.test('parseSearchInput rifiuta input troppo corto o troppo lungo', () => {
  assertEquals(parseSearchInput({ ...valid, input: 'vi' }), null);
  assertEquals(parseSearchInput({ ...valid, input: '  v  ' }), null);
  assertEquals(parseSearchInput({ ...valid, input: 'x'.repeat(81) }), null);
  assertEquals(parseSearchInput({ ...valid, input: 'x'.repeat(80) })?.input.length, 80);
});

Deno.test('parseSearchInput rifiuta sessionToken non UUID, lingua o città non valide', () => {
  assertEquals(parseSearchInput({ ...valid, sessionToken: 'abc' }), null);
  assertEquals(parseSearchInput({ ...valid, sessionToken: undefined }), null);
  assertEquals(parseSearchInput({ ...valid, language: 'fr' }), null);
  assertEquals(parseSearchInput({ ...valid, citySlug: '' }), null);
  assertEquals(parseSearchInput(null), null);
  assertEquals(parseSearchInput('testo'), null);
});

Deno.test(
  'la richiesta Autocomplete è una POST con sessione, cerchio della città, lingua e paese',
  () => {
    const { url, init } = buildAutocompleteRequest(
      { input: 'via torino', sessionToken: SESSION, language: 'en' },
      { center: { lat: 45.4642, lng: 9.19 }, radiusM: 8000, country: 'IT' },
      'chiave',
    );
    assertEquals(url, AUTOCOMPLETE_URL);
    assertEquals(url, 'https://places.googleapis.com/v1/places:autocomplete');
    assertEquals(init.method, 'POST');
    const headers = init.headers as Record<string, string>;
    assertEquals(headers['X-Goog-Api-Key'], 'chiave');
    assertEquals(JSON.parse(String(init.body)), {
      input: 'via torino',
      sessionToken: SESSION,
      languageCode: 'en',
      includedRegionCodes: ['it'],
      locationRestriction: {
        circle: { center: { latitude: 45.4642, longitude: 9.19 }, radius: 8000 },
      },
    });
  },
);

Deno.test('toSuggestions estrae al massimo 5 predizioni di luoghi e salta le query', () => {
  const place = (n: number) => ({
    placePrediction: {
      placeId: `id${n}`,
      text: { text: `Via ${n}, Milano` },
      structuredFormat: { mainText: { text: `Via ${n}` }, secondaryText: { text: 'Milano MI' } },
      types: ['route', 'geocode'],
    },
  });
  const response = {
    suggestions: [{ queryPrediction: { text: { text: 'via' } } }, ...[1, 2, 3, 4, 5, 6].map(place)],
  };
  const out = toSuggestions(response);
  assertEquals(out.length, 5);
  assertEquals(out[0], {
    placeId: 'id1',
    primaryText: 'Via 1',
    secondaryText: 'Milano MI',
    types: ['route', 'geocode'],
  });
});

Deno.test('toSuggestions tollera risposte vuote o malformate', () => {
  assertEquals(toSuggestions({}), []);
  assertEquals(toSuggestions(null), []);
  assertEquals(toSuggestions({ suggestions: [{ placePrediction: { text: { text: 'x' } } }] }), []);
  assertEquals(
    toSuggestions({
      suggestions: [{ placePrediction: { placeId: 'a', text: { text: 'Solo testo' } } }],
    }),
    [{ placeId: 'a', primaryText: 'Solo testo', secondaryText: '', types: [] }],
  );
});

Deno.test('requireApiKey è fail-closed senza chiave e non rivela nulla', () => {
  assertThrows(() => requireApiKey(''), Error, 'MISSING_GOOGLE_PLACES_API_KEY');
  assertEquals(requireApiKey('k'), 'k');
});
