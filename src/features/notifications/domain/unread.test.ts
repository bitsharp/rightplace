import { unreadRooms, unseenActivity } from './unread';

const room = (roomId: string, lastAt: string | null, lastHandle: string | null) => ({
  roomId,
  lastAt,
  lastHandle,
});

describe('unreadRooms', () => {
  it('conta le stanze con un ultimo messaggio altrui più recente dell’ultima lettura', () => {
    const rooms = [
      room('r1', '2026-11-13T21:00:00Z', 'volpe.viola'),
      room('r2', '2026-11-13T21:00:00Z', 'volpe.viola'),
    ];
    expect(
      unreadRooms(rooms, { r1: '2026-11-13T20:00:00Z', r2: '2026-11-13T22:00:00Z' }, 'lince.rosso'),
    ).toBe(1);
  });

  it('una stanza mai aperta con messaggi altrui è da leggere', () => {
    expect(
      unreadRooms([room('r1', '2026-11-13T21:00:00Z', 'volpe.viola')], {}, 'lince.rosso'),
    ).toBe(1);
  });

  it('i miei messaggi non fanno mai diventare la stanza da leggere', () => {
    expect(
      unreadRooms([room('r1', '2026-11-13T21:00:00Z', 'lince.rosso')], {}, 'lince.rosso'),
    ).toBe(0);
  });

  it('una stanza senza messaggi visibili non è da leggere', () => {
    expect(unreadRooms([room('r1', null, null)], {}, 'lince.rosso')).toBe(0);
  });
});

describe('unseenActivity', () => {
  const activity = [{ createdAt: '2026-11-13T10:00:00Z' }, { createdAt: '2026-11-13T12:00:00Z' }];

  it('conta le novità successive all’ultima apertura', () => {
    expect(unseenActivity(activity, '2026-11-13T11:00:00Z')).toBe(1);
  });

  it('senza apertura precedente sono tutte nuove', () => {
    expect(unseenActivity(activity, null)).toBe(2);
  });

  it('dopo aver visto tutto non resta nulla', () => {
    expect(unseenActivity(activity, '2026-11-13T12:00:00Z')).toBe(0);
  });
});
