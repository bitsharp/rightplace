// Mirrors search_users on the server, which ignores queries shorter than two characters.
export const MIN_QUERY_LENGTH = 2;

export function normalizeSearchQuery(text: string): string {
  return text.trim().replace(/^@/, '').trim().toLowerCase();
}

export function isSearchable(text: string): boolean {
  return normalizeSearchQuery(text).length >= MIN_QUERY_LENGTH;
}
