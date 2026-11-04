import type { Story } from '@/components/app/TopBar';

import type { StoryEntry } from '../api';

const initialOf = (handle: string) => handle.replace(/^@/, '').charAt(0).toUpperCase();

// The viewer's own bubble first, then accepted follows with a post in the last 24 hours.
export function buildTopBarStories(myHandle: string, entries: readonly StoryEntry[]): Story[] {
  return [
    { id: 'me', handle: myHandle, initial: initialOf(myHandle), tone: 'neutral', mine: true },
    ...entries.map((entry): Story => ({
      id: entry.userId,
      handle: entry.handle,
      initial: initialOf(entry.handle),
      tone: 'going',
    })),
  ];
}
