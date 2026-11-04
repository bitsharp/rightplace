import { assertEquals } from 'jsr:@std/assert@1';
import {
  buildDetailsRequest,
  DETAILS_FIELD_MASK,
  detailsToRow,
  isRealPlaceId,
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

Deno.test('la richiesta Place Details è una GET con field mask minima', () => {
  const { url, init } = buildDetailsRequest('abc', 'chiave', 'it');
  assertEquals(url, 'https://places.googleapis.com/v1/places/abc?languageCode=it');
  assertEquals(init.method, 'GET');
  const headers = init.headers as Record<string, string>;
  assertEquals(headers['X-Goog-Api-Key'], 'chiave');
  assertEquals(headers['X-Goog-FieldMask'], DETAILS_FIELD_MASK);
  assertEquals(DETAILS_FIELD_MASK, 'id,displayName,location,formattedAddress,regularOpeningHours');
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
