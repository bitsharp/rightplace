import { isUnseen, markSeen, MAX_SEEN_KEYS, storyKey } from './stories';

describe('storie viste', () => {
  const story = { userId: 'u1', latestPostAt: '2026-11-09T05:00:00Z' };

  it('la chiave unisce persona e ultimo post, senza contenuti', () => {
    expect(storyKey(story.userId, story.latestPostAt)).toBe('u1:2026-11-09T05:00:00Z');
  });

  it('una storia è non vista finché la sua chiave non è tra le viste', () => {
    expect(isUnseen(story, [])).toBe(true);
    expect(isUnseen(story, [storyKey('u1', story.latestPostAt)])).toBe(false);
  });

  it('un nuovo post della stessa persona la rende di nuovo non vista', () => {
    const seen = [storyKey('u1', '2026-11-08T05:00:00Z')];
    expect(isUnseen(story, seen)).toBe(true);
  });

  it('markSeen aggiunge la chiave una sola volta', () => {
    expect(markSeen(['a'], 'b')).toEqual(['a', 'b']);
    expect(markSeen(['a', 'b'], 'a')).toEqual(['b', 'a']);
  });

  it('tiene solo le ultime chiavi, scartando le più vecchie', () => {
    const many = Array.from({ length: MAX_SEEN_KEYS }, (_, i) => `k${i}`);
    const next = markSeen(many, 'nuova');
    expect(next).toHaveLength(MAX_SEEN_KEYS);
    expect(next[next.length - 1]).toBe('nuova');
    expect(next).not.toContain('k0');
  });
});
