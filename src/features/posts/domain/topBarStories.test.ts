import { buildTopBarStories } from './topBarStories';
import { storyKey } from './stories';

const ME = { userId: 'me', handle: 'lince.rosso' };
const VOLPE = { userId: 'u2', handle: 'volpe.viola', latestPostAt: '2026-11-09T09:00:00Z' };
const ORSO = { userId: 'u3', handle: 'orso.verde', latestPostAt: '2026-11-09T08:00:00Z' };

describe('buildTopBarStories', () => {
  it('senza miei post recenti non c’è "La tua storia"', () => {
    const stories = buildTopBarStories({ me: ME, myLatestPostAt: null, entries: [], seenKeys: [] });
    expect(stories).toEqual([]);
  });

  it('con un mio post recente comincia da "La tua storia", segnata come mia', () => {
    const [mine] = buildTopBarStories({
      me: ME,
      myLatestPostAt: '2026-11-09T07:00:00Z',
      entries: [],
      seenKeys: [],
    });
    expect(mine).toEqual({
      id: 'me',
      handle: 'lince.rosso',
      initial: 'L',
      tone: 'neutral',
      mine: true,
      seen: false,
    });
  });

  it('aggiunge i seguiti nell’ordine del server, con visto/non visto dalle chiavi locali', () => {
    const stories = buildTopBarStories({
      me: ME,
      myLatestPostAt: null,
      entries: [VOLPE, ORSO],
      seenKeys: [storyKey('u3', ORSO.latestPostAt)],
    });
    expect(stories.map(({ id, seen }) => [id, seen])).toEqual([
      ['u2', false],
      ['u3', true],
    ]);
    expect(stories[0]).toMatchObject({ handle: 'volpe.viola', initial: 'V', tone: 'going' });
  });

  it('un post nuovo della stessa persona torna "non visto"', () => {
    const stories = buildTopBarStories({
      me: ME,
      myLatestPostAt: null,
      entries: [VOLPE],
      seenKeys: [storyKey('u2', '2026-11-08T09:00:00Z')],
    });
    expect(stories[0]?.seen).toBe(false);
  });

  it('senza handle usa un’iniziale vuota invece di rompersi', () => {
    const [mine] = buildTopBarStories({
      me: { userId: 'me', handle: '' },
      myLatestPostAt: 'x',
      entries: [],
      seenKeys: [],
    });
    expect(mine?.initial).toBe('');
  });
});
