import { json } from '../_shared/auth.ts';
import { parseSearchInput, type SearchInput, toSuggestions } from '../_shared/places/search.ts';
import type { SearchCity } from '../_shared/places/types.ts';

export type SearchCityRecord = SearchCity & { isActive: boolean };

export type SearchHandlerDeps = {
  hasPlacesKey: () => boolean;
  getUserId: (request: Request) => Promise<string | null>;
  getCity: (slug: string) => Promise<SearchCityRecord | null>;
  // True when the token is already known (same session) or the user is under the limit of new sessions.
  consumeSession: (userId: string, sessionToken: string) => Promise<boolean>;
  fetchAutocomplete: (spec: {
    request: Pick<SearchInput, 'input' | 'sessionToken' | 'language'>;
    city: SearchCity;
  }) => Promise<unknown>;
};

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Called by the app with the user's JWT. The typed text is only forwarded to Google: never stored, never logged.
export async function handleSearch(request: Request, deps: SearchHandlerDeps): Promise<Response> {
  const userId = await deps.getUserId(request);
  if (userId === null) return json({ error: 'UNAUTHORIZED' }, 401);
  const search = parseSearchInput(await readBody(request));
  if (search === null) return json({ error: 'INVALID_ARGUMENT' }, 400);
  if (!deps.hasPlacesKey()) return json({ error: 'INTERNAL' }, 500);

  const city = await deps.getCity(search.citySlug);
  if (city === null || !city.isActive) return json({ error: 'NOT_FOUND' }, 404);
  // The server decides what a new session is (a token it has not seen for this user): nothing the client says counts.
  if (!(await deps.consumeSession(userId, search.sessionToken))) {
    return json({ error: 'RATE_LIMITED' }, 429);
  }
  try {
    const { input, sessionToken, language } = search;
    const { center, radiusM, country } = city;
    const response = await deps.fetchAutocomplete({
      request: { input, sessionToken, language },
      city: { center, radiusM, country },
    });
    return json({ suggestions: toSuggestions(response) });
  } catch {
    return json({ error: 'SEARCH_FAILED' }, 502);
  }
}
