import { z } from 'zod';

import { supabase } from '@/lib/supabase';

export type GoogleLanguage = 'it' | 'en';
export type GoogleSearchErrorCode = 'RATE_LIMITED' | 'OUT_OF_CITY' | 'FAILED';

export class GoogleSearchError extends Error {
  constructor(readonly code: GoogleSearchErrorCode) {
    super(code);
    this.name = 'GoogleSearchError';
  }
}

const suggestionSchema = z.object({
  placeId: z.string(),
  primaryText: z.string(),
  secondaryText: z.string(),
  types: z.array(z.string()),
});
export type GoogleSuggestion = z.infer<typeof suggestionSchema>;

// supabase-js puts the failed Response in `context`: its status tells quota (429) from the rest.
function statusOf(error: unknown): number | null {
  const context = (error as { context?: { status?: unknown } } | null)?.context;
  return typeof context?.status === 'number' ? context.status : null;
}

function toError(error: unknown): GoogleSearchError {
  const status = statusOf(error);
  if (status === 429) return new GoogleSearchError('RATE_LIMITED');
  return new GoogleSearchError(status === 422 ? 'OUT_OF_CITY' : 'FAILED');
}

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw toError(error);
  return data;
}

type SearchArgs = {
  input: string;
  sessionToken: string;
  citySlug: string;
  language: GoogleLanguage;
};

// The Google key lives only in the Edge Function; the quota is counted there, by session token.
export async function searchGooglePlaces(args: SearchArgs): Promise<GoogleSuggestion[]> {
  const data = await invokeFunction('places-search', { ...args });
  const parsed = z.object({ suggestions: z.array(suggestionSchema) }).safeParse(data);
  if (!parsed.success) throw new GoogleSearchError('FAILED');
  return parsed.data.suggestions;
}

type SelectArgs = {
  placeId: string;
  sessionToken: string;
  citySlug: string;
  language: GoogleLanguage;
};

// Closes the Google session with one Place Details call (server side) and returns our venue id.
export async function selectGooglePlace(args: SelectArgs): Promise<string> {
  const data = await invokeFunction('places-detail', {
    place_id: args.placeId,
    session_token: args.sessionToken,
    city_slug: args.citySlug,
    language: args.language,
  });
  const parsed = z.object({ venue_id: z.string() }).safeParse(data);
  if (!parsed.success) throw new GoogleSearchError('FAILED');
  return parsed.data.venue_id;
}
