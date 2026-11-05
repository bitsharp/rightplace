import type { Story } from '@/components/app/TopBar';

import { isUnseen, storyKey } from './stories';

type Entry = { userId: string; handle: string; latestPostAt: string };

type Input = {
  me: { userId: string; handle: string };
  // Newest post of mine in the last 24 h (they count even before my followers can see them).
  myLatestPostAt: string | null;
  // Accepted follows with a post in the last 24 h, in the order the server gave.
  entries: readonly Entry[];
  seenKeys: readonly string[];
};

const initialOf = (handle: string) => handle.replace(/^@/, '').charAt(0).toUpperCase();

export function buildTopBarStories({ me, myLatestPostAt, entries, seenKeys }: Input): Story[] {
  const mine: Story[] = myLatestPostAt
    ? [
        {
          id: 'me',
          handle: me.handle,
          initial: initialOf(me.handle),
          tone: 'neutral',
          mine: true,
          seen: seenKeys.includes(storyKey(me.userId, myLatestPostAt)),
        },
      ]
    : [];
  const others = entries.map((entry): Story => ({
    id: entry.userId,
    handle: entry.handle,
    initial: initialOf(entry.handle),
    tone: 'going',
    seen: !isUnseen(entry, seenKeys),
  }));
  return [...mine, ...others];
}
