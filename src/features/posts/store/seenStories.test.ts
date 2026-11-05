import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAX_SEEN_KEYS } from '../domain/stories';
import { resetSeenStories, SEEN_STORIES_KEY, useSeenStories } from './seenStories';

describe('seenStories', () => {
  it('parte vuoto', () => {
    expect(useSeenStories.getState().seen).toEqual([]);
  });

  it('segna una storia come vista, senza doppioni', () => {
    useSeenStories.getState().markSeen('u1:2026-11-09T05:00:00Z');
    useSeenStories.getState().markSeen('u1:2026-11-09T05:00:00Z');
    expect(useSeenStories.getState().seen).toEqual(['u1:2026-11-09T05:00:00Z']);
  });

  it('salva su disco solo le chiavi, mai contenuti, e ne tiene un numero limitato', async () => {
    for (let i = 0; i < MAX_SEEN_KEYS + 5; i += 1) useSeenStories.getState().markSeen(`u${i}:t`);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const saved = JSON.parse((await AsyncStorage.getItem(SEEN_STORIES_KEY)) ?? '{}');
    expect(Object.keys(saved.state)).toEqual(['seen']);
    expect(saved.state.seen).toHaveLength(MAX_SEEN_KEYS);
  });

  it('resetSeenStories dimentica tutto (uscita dall’account)', () => {
    useSeenStories.getState().markSeen('a:b');
    resetSeenStories();
    expect(useSeenStories.getState().seen).toEqual([]);
  });
});
