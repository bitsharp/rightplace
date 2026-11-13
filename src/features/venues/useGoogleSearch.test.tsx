import { act, renderHook } from '@testing-library/react-native';

import { GOOGLE_DEBOUNCE_MS } from './domain/googleSession';
import { GoogleSearchError } from './googleApi';
import * as api from './googleApi';
import { useGoogleSearch } from './useGoogleSearch';

jest.mock('./googleApi', () => ({
  ...jest.requireActual('./googleApi'),
  searchGooglePlaces: jest.fn(),
  selectGooglePlace: jest.fn(),
}));
let uuidCounter = 0;
jest.mock('./sessionToken', () => ({
  newSessionToken: () => `00000000-0000-4000-8000-${String((uuidCounter += 1)).padStart(12, '0')}`,
}));

const search = jest.mocked(api.searchGooglePlaces);
const select = jest.mocked(api.selectGooglePlace);
const suggestion = {
  placeId: 'A',
  primaryText: 'Via Torino 20',
  secondaryText: 'Milano',
  types: [],
};

async function setup(initial = '') {
  const hook = await renderHook(
    ({ query }: { query: string }) => useGoogleSearch(query, 'milano'),
    { initialProps: { query: initial } },
  );
  const type = (query: string) => hook.rerender({ query });
  const tick = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));
  return { hook, type, tick };
}

describe('useGoogleSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    uuidCounter = 0;
    search.mockReset().mockResolvedValue([suggestion]);
    select.mockReset().mockResolvedValue('venue-1');
  });
  afterEach(() => jest.useRealTimers());

  it('sotto i 3 caratteri non chiama Google', async () => {
    const { type, tick } = await setup();
    await type('vi');
    await tick(GOOGLE_DEBOUNCE_MS * 2);
    expect(search).not.toHaveBeenCalled();
  });

  it("aspetta 300 ms dall'ultimo carattere e fa una sola richiesta", async () => {
    const { hook, type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS - 50);
    await type('via t');
    await tick(GOOGLE_DEBOUNCE_MS - 50);
    expect(search).not.toHaveBeenCalled();
    await tick(100);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toMatchObject({
      input: 'via t',
      citySlug: 'milano',
      language: 'it',
    });
    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.suggestions).toEqual([suggestion]);
  });

  it('usa lo stesso sessionToken per tutta la digitazione', async () => {
    const { type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    await type('via torino');
    await tick(GOOGLE_DEBOUNCE_MS);
    const tokens = search.mock.calls.map(([args]) => args.sessionToken);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toBe(tokens[1]);
  });

  it('svuotare il campo chiude la sessione: la ricerca dopo ha un token nuovo', async () => {
    const { hook, type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    await type('');
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.suggestions).toEqual([]);
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    const tokens = search.mock.calls.map(([args]) => args.sessionToken);
    expect(tokens[0]).not.toBe(tokens[1]);
  });

  it('la selezione manda place_id e token alla Details, restituisce il venue e chiude la sessione', async () => {
    const { hook, type, tick } = await setup();
    await type('via torino');
    await tick(GOOGLE_DEBOUNCE_MS);
    const token = search.mock.calls[0]?.[0].sessionToken;
    let venueId: string | null = null;
    await act(async () => {
      venueId = await hook.result.current.select(suggestion);
    });
    expect(venueId).toBe('venue-1');
    expect(select).toHaveBeenCalledWith({
      placeId: 'A',
      sessionToken: token,
      citySlug: 'milano',
      language: 'it',
    });
    await type('via torino 2');
    await tick(GOOGLE_DEBOUNCE_MS);
    expect(search.mock.calls[1]?.[0].sessionToken).not.toBe(token);
  });

  it('429 mostra lo stato "limite" e nessun risultato', async () => {
    search.mockRejectedValue(new GoogleSearchError('RATE_LIMITED'));
    const { hook, type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    expect(hook.result.current.status).toBe('limit');
    expect(hook.result.current.suggestions).toEqual([]);
  });

  it('un altro errore mostra lo stato "errore"', async () => {
    search.mockRejectedValue(new GoogleSearchError('FAILED'));
    const { hook, type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    expect(hook.result.current.status).toBe('error');
  });

  it('una risposta lenta di una ricerca vecchia non sovrascrive quella nuova', async () => {
    let resolveFirst: (rows: (typeof suggestion)[]) => void = () => undefined;
    search.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
    search.mockResolvedValueOnce([{ ...suggestion, placeId: 'NEW' }]);
    const { hook, type, tick } = await setup();
    await type('via');
    await tick(GOOGLE_DEBOUNCE_MS);
    await type('via torino');
    await tick(GOOGLE_DEBOUNCE_MS);
    await act(async () => resolveFirst([suggestion]));
    expect(hook.result.current.suggestions.map((row) => row.placeId)).toEqual(['NEW']);
  });

  it('un errore di selezione resta indicato e la sessione continua', async () => {
    select.mockRejectedValue(new GoogleSearchError('OUT_OF_CITY'));
    const { hook, type, tick } = await setup();
    await type('via torino');
    await tick(GOOGLE_DEBOUNCE_MS);
    await act(async () => {
      expect(await hook.result.current.select(suggestion)).toBeNull();
    });
    expect(hook.result.current.selectError).toBe('OUT_OF_CITY');
  });
});
