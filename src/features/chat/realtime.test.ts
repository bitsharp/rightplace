import { backoffMs, parseInsertedMessage } from './realtime';

const me = { userId: 'me', handle: 'lince.rosso' };
const following = [{ userId: 'amico', handle: 'volpe.viola' }];

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  room_id: 'r1',
  user_id: 'amico',
  kind: 'text',
  text: 'ciao',
  photo_path: null,
  created_at: '2026-11-07T22:00:00Z',
  ...overrides,
});

describe('parseInsertedMessage', () => {
  it('converte il messaggio di un seguito, con il suo handle', () => {
    expect(parseInsertedMessage(row(), 'r1', me, following)).toEqual({
      id: 'm1',
      userId: 'amico',
      handle: 'volpe.viola',
      kind: 'text',
      text: 'ciao',
      createdAt: '2026-11-07T22:00:00Z',
      isMine: false,
    });
  });

  it('riconosce i miei messaggi', () => {
    expect(parseInsertedMessage(row({ user_id: 'me' }), 'r1', me, following)).toMatchObject({
      handle: 'lince.rosso',
      isMine: true,
    });
  });

  it('scarta il messaggio di chi non seguo (principio 6, difesa in profondità)', () => {
    expect(parseInsertedMessage(row({ user_id: 'sconosciuto' }), 'r1', me, following)).toBeNull();
  });

  it("scarta i messaggi di un'altra stanza", () => {
    expect(parseInsertedMessage(row({ room_id: 'r2' }), 'r1', me, following)).toBeNull();
  });

  it('scarta un payload con forma inattesa', () => {
    expect(parseInsertedMessage({ id: 'm1' }, 'r1', me, following)).toBeNull();
    expect(parseInsertedMessage(null, 'r1', me, following)).toBeNull();
  });

  it('non porta mai con sé il path della foto: la foto si legge solo con URL firmato', () => {
    const photo = parseInsertedMessage(
      row({ kind: 'photo', text: null, photo_path: 'amico/x.jpg' }),
      'r1',
      me,
      following,
    );
    expect(photo).toMatchObject({ kind: 'photo', text: null });
    expect(photo).not.toHaveProperty('photoPath');
    expect(photo).not.toHaveProperty('photo_path');
  });
});

describe('backoffMs', () => {
  it('raddoppia da 1 s e si ferma a 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(backoffMs)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
  });
});
