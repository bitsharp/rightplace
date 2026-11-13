import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  GOOGLE_DEBOUNCE_MS,
  isGoogleQueryReady,
  nextSessionToken,
  type SessionEvent,
} from './domain/googleSession';
import {
  GoogleSearchError,
  searchGooglePlaces,
  selectGooglePlace,
  type GoogleLanguage,
  type GoogleSearchErrorCode,
  type GoogleSuggestion,
} from './googleApi';
import { newSessionToken } from './sessionToken';

export type GoogleStatus = 'idle' | 'loading' | 'ready' | 'error' | 'limit';

const NO_SUGGESTIONS: GoogleSuggestion[] = [];

const codeOf = (error: unknown): GoogleSearchErrorCode =>
  error instanceof GoogleSearchError ? error.code : 'FAILED';

// "Risultati da Google": debounced autocomplete for the typed text, one session token per typing session.
// The text only goes to our Edge Function (which holds the Google key); nothing is stored on the device.
type Outcome = { status: Exclude<GoogleStatus, 'idle'>; suggestions: GoogleSuggestion[] };
type SelectFailure = { text: string; code: GoogleSearchErrorCode };

// "Risultati da Google": debounced autocomplete for the typed text, one session token per typing session.
// The text only goes to our Edge Function (which holds the Google key); nothing is stored on the device.
export function useGoogleSearch(query: string, citySlug: string) {
  const { i18n } = useTranslation();
  const language: GoogleLanguage = i18n.language.startsWith('en') ? 'en' : 'it';
  const text = query.trim();
  const ready = isGoogleQueryReady(text);
  const token = useRef<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<SelectFailure | null>(null);
  const [selecting, setSelecting] = useState(false);

  const advance = useCallback((event: SessionEvent) => {
    token.current = nextSessionToken(token.current, event, newSessionToken);
  }, []);

  useEffect(() => {
    advance(text === '' ? 'clear' : 'type');
    if (!isGoogleQueryReady(text) || token.current === null) return;
    const sessionToken = token.current;
    let stale = false;
    const timer = setTimeout(() => {
      setOutcome({ status: 'loading', suggestions: NO_SUGGESTIONS });
      searchGooglePlaces({ input: text, sessionToken, citySlug, language }).then(
        (suggestions) => {
          if (!stale) setOutcome({ status: 'ready', suggestions });
        },
        (error: unknown) => {
          if (stale) return;
          const status = codeOf(error) === 'RATE_LIMITED' ? 'limit' : 'error';
          setOutcome({ status, suggestions: NO_SUGGESTIONS });
        },
      );
    }, GOOGLE_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [text, citySlug, language, advance]);

  const select = useCallback(
    async (suggestion: GoogleSuggestion): Promise<string | null> => {
      if (token.current === null) return null;
      setSelecting(true);
      setFailure(null);
      try {
        const venueId = await selectGooglePlace({
          placeId: suggestion.placeId,
          sessionToken: token.current,
          citySlug,
          language,
        });
        advance('select');
        return venueId;
      } catch (error) {
        setFailure({ text, code: codeOf(error) });
        return null;
      } finally {
        setSelecting(false);
      }
    },
    [citySlug, language, advance, text],
  );

  const status: GoogleStatus = ready ? (outcome?.status ?? 'idle') : 'idle';
  return {
    status,
    suggestions: ready ? (outcome?.suggestions ?? NO_SUGGESTIONS) : NO_SUGGESTIONS,
    // A selection failure belongs to the text it happened on: typing on clears it.
    selectError: failure?.text === text ? failure.code : null,
    selecting,
    select,
  };
}
