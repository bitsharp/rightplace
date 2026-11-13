import type { GoogleSuggestion } from '../googleApi';

// A Google result whose place is already a catalog row on screen is shown only as that row.
export function withoutCatalogDuplicates(
  suggestions: readonly GoogleSuggestion[],
  shownCatalog: readonly { googlePlaceId: string }[],
): GoogleSuggestion[] {
  const seen = new Set(shownCatalog.map((row) => row.googlePlaceId));
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.placeId)) return false;
    seen.add(suggestion.placeId);
    return true;
  });
}
