import type { PlaceSuggestion, SearchCity, SearchLanguage } from './types.ts';

export const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const MAX_SUGGESTIONS = 5;
const MIN_INPUT = 3;
const MAX_INPUT = 80;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SearchInput = {
  input: string;
  sessionToken: string;
  citySlug: string;
  language: SearchLanguage;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isSearchLanguage = (value: unknown): value is SearchLanguage =>
  value === 'it' || value === 'en';

export const isSessionToken = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);

export function parseSearchInput(body: unknown): SearchInput | null {
  if (!isRecord(body)) return null;
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  const { sessionToken, citySlug, language } = body;
  if (input.length < MIN_INPUT || input.length > MAX_INPUT) return null;
  if (!isSessionToken(sessionToken) || !isSearchLanguage(language)) return null;
  if (typeof citySlug !== 'string' || citySlug === '' || citySlug.length > 60) return null;
  return { input, sessionToken, citySlug, language };
}

// Fail closed: without the key nothing is sent, and the error never says more than "missing".
export function requireApiKey(apiKey: string): string {
  if (apiKey === '') throw new Error('MISSING_GOOGLE_PLACES_API_KEY');
  return apiKey;
}

// No field mask: Autocomplete (New) has a fixed response, billed per request (free when the session ends in a
// Details call). The restriction keeps suggestions inside the city and its country.
export function buildAutocompleteRequest(
  search: Pick<SearchInput, 'input' | 'sessionToken' | 'language'>,
  city: SearchCity,
  apiKey: string,
): { url: string; init: RequestInit } {
  return {
    url: AUTOCOMPLETE_URL,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({
        input: search.input,
        sessionToken: search.sessionToken,
        languageCode: search.language,
        includedRegionCodes: [city.country.toLowerCase()],
        locationRestriction: {
          circle: {
            center: { latitude: city.center.lat, longitude: city.center.lng },
            radius: city.radiusM,
          },
        },
      }),
    },
  };
}

const textOf = (value: unknown): string =>
  isRecord(value) && typeof value.text === 'string' ? value.text : '';

function toSuggestion(prediction: Record<string, unknown>): PlaceSuggestion | null {
  const { placeId } = prediction;
  if (typeof placeId !== 'string' || placeId === '') return null;
  const structured = isRecord(prediction.structuredFormat) ? prediction.structuredFormat : {};
  const primaryText = textOf(structured.mainText) || textOf(prediction.text);
  if (primaryText === '') return null;
  const types = Array.isArray(prediction.types)
    ? prediction.types.filter((type): type is string => typeof type === 'string')
    : [];
  return { placeId, primaryText, secondaryText: textOf(structured.secondaryText), types };
}

export function toSuggestions(response: unknown): PlaceSuggestion[] {
  if (!isRecord(response) || !Array.isArray(response.suggestions)) return [];
  const out: PlaceSuggestion[] = [];
  for (const entry of response.suggestions) {
    if (!isRecord(entry) || !isRecord(entry.placePrediction)) continue;
    const suggestion = toSuggestion(entry.placePrediction);
    if (suggestion) out.push(suggestion);
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}
