import { buildTopBarStories } from './stories';

describe('buildTopBarStories', () => {
  it('comincia sempre da "La tua storia", segnata come tua', () => {
    expect(buildTopBarStories('lince.rosso', [])).toEqual([
      { id: 'me', handle: 'lince.rosso', initial: 'L', tone: 'neutral', mine: true },
    ]);
  });

  it('aggiunge i seguiti con un post recente, nell’ordine ricevuto dal server', () => {
    const stories = buildTopBarStories('lince.rosso', [
      { userId: 'u2', handle: 'volpe.viola', latestPostAt: '2026-11-04T09:00:00Z' },
      { userId: 'u3', handle: 'orso.grigio', latestPostAt: '2026-11-04T08:00:00Z' },
    ]);
    expect(stories.map((story) => story.id)).toEqual(['me', 'u2', 'u3']);
    expect(stories[1]).toEqual({ id: 'u2', handle: 'volpe.viola', initial: 'V', tone: 'going' });
  });

  it('senza handle usa un’iniziale vuota invece di rompersi', () => {
    expect(buildTopBarStories('', [])[0]?.initial).toBe('');
  });
});
