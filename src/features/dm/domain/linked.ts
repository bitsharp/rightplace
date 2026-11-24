import type { SearchResult } from '@/features/friends/api';

// Mirrors private.is_linked only to decide whether to draw the "Messaggio" button: an accepted follow in either
// direction (people who blocked each other never appear in search at all). The server decides every message.
export function canMessage(person: Pick<SearchResult, 'followState' | 'followsMe'>): boolean {
  return person.followState === 'accepted' || person.followsMe;
}
