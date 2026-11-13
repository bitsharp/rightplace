import { fakeSupabase } from '@/test/fakeSupabase';

import { GoogleSearchError, searchGooglePlaces, selectGooglePlace } from './googleApi';

const TOKEN = '3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90';
const invoke = fakeSupabase.functions.invoke;

const httpError = (status: number) => ({ message: 'x', context: { status } });

describe('searchGooglePlaces', () => {
  const args = {
    input: 'via torino',
    sessionToken: TOKEN,
    citySlug: 'milano',
    language: 'it' as const,
  };

  it('chiama places-search con testo, sessione, città e lingua: nessun flag di quota', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        suggestions: [
          { placeId: 'A', primaryText: 'Via Torino', secondaryText: 'Milano', types: ['route'] },
        ],
      },
      error: null,
    });
    await expect(searchGooglePlaces(args)).resolves.toEqual([
      { placeId: 'A', primaryText: 'Via Torino', secondaryText: 'Milano', types: ['route'] },
    ]);
    expect(invoke).toHaveBeenCalledWith('places-search', {
      body: { input: 'via torino', sessionToken: TOKEN, citySlug: 'milano', language: 'it' },
    });
  });

  it('429 diventa RATE_LIMITED', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(429) });
    await expect(searchGooglePlaces(args)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('ogni altro errore diventa FAILED', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(502) });
    await expect(searchGooglePlaces(args)).rejects.toBeInstanceOf(GoogleSearchError);
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(searchGooglePlaces(args)).rejects.toMatchObject({ code: 'FAILED' });
  });

  it('una risposta malformata è un errore, non una lista vuota inventata', async () => {
    invoke.mockResolvedValueOnce({ data: { suggestions: 'no' }, error: null });
    await expect(searchGooglePlaces(args)).rejects.toMatchObject({ code: 'FAILED' });
  });
});

describe('selectGooglePlace', () => {
  const args = { placeId: 'A', sessionToken: TOKEN, citySlug: 'milano', language: 'en' as const };

  it('chiama places-detail con place_id, sessione, città e lingua e restituisce il venue_id', async () => {
    invoke.mockResolvedValueOnce({ data: { venue_id: 'v1' }, error: null });
    await expect(selectGooglePlace(args)).resolves.toBe('v1');
    expect(invoke).toHaveBeenCalledWith('places-detail', {
      body: { place_id: 'A', session_token: TOKEN, city_slug: 'milano', language: 'en' },
    });
  });

  it('422 è OUT_OF_CITY, il resto FAILED', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(422) });
    await expect(selectGooglePlace(args)).rejects.toMatchObject({ code: 'OUT_OF_CITY' });
    invoke.mockResolvedValueOnce({ data: null, error: httpError(502) });
    await expect(selectGooglePlace(args)).rejects.toMatchObject({ code: 'FAILED' });
  });
});
