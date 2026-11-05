import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { markSeen } from '../domain/stories';

export const SEEN_STORIES_KEY = 'rightplace.seen-stories';

type SeenState = {
  seen: string[];
  markSeen: (key: string) => void;
};

// "Seen" is a local-only convenience: just `userId:latestPostAt` keys, never post content (principle 5).
export const useSeenStories = create<SeenState>()(
  persist(
    (set) => ({
      seen: [],
      markSeen: (key) => set((state) => ({ seen: markSeen(state.seen, key) })),
    }),
    {
      name: SEEN_STORIES_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ seen }) => ({ seen }),
    },
  ),
);

export function resetSeenStories(): void {
  useSeenStories.setState({ seen: [] });
}
