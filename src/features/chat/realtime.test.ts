import { backoffMs, parseInsertedMessage } from './realtime';

const me = { userId: 'me', handle: 'lince.rosso' };
const known = [{ userId: 'amico', handle: 'volpe.viola' }];

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
  it('converte il messaggio di un autore già noto nella stanza, con il suo handle', () => {
    expect(parseInsertedMessage(row(), 'r1', me, known)).toEqual({
      type: 'append',
      message: {
        id: 'm1',
        userId: 'amico',
        handle: 'volpe.viola',
        kind: 'text',
        text: 'ciao',
        createdAt: '2026-11-07T22:00:00Z',
        isMine: false,
      },
    });
  });

  it('riconosce i miei messaggi', () => {
    expect(parseInsertedMessage(row({ user_id: 'me' }), 'r1', me, known)).toMatchObject({
      type: 'append',
      message: { handle: 'lince.rosso', isMine: true },
    });
  });

  // la visibilità vive in SQL (private.can_see_chat_author_for): ogni INSERT ricevuto è visibile per definizione
  it("per un autore sconosciuto chiede di ricaricare i messaggi invece di inventare l'handle", () => {
    expect(parseInsertedMessage(row({ user_id: 'amico.di.amico' }), 'r1', me, known)).toEqual({
      type: 'refetch',
    });
  });

  it("ignora i messaggi di un'altra stanza", () => {
    expect(parseInsertedMessage(row({ room_id: 'r2' }), 'r1', me, known)).toEqual({
      type: 'ignore',
    });
  });

  it('ignora un payload con forma inattesa', () => {
    expect(parseInsertedMessage({ id: 'm1' }, 'r1', me, known)).toEqual({ type: 'ignore' });
    expect(parseInsertedMessage(null, 'r1', me, known)).toEqual({ type: 'ignore' });
  });

  it('non porta mai con sé il path della foto: la foto si legge solo con URL firmato', () => {
    const result = parseInsertedMessage(
      row({ kind: 'photo', text: null, photo_path: 'amico/x.jpg' }),
      'r1',
      me,
      known,
    );
    expect(result).toMatchObject({ type: 'append', message: { kind: 'photo', text: null } });
    expect(JSON.stringify(result)).not.toContain('x.jpg');
  });
});

describe('backoffMs', () => {
  it('raddoppia da 1 s e si ferma a 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(backoffMs)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
  });
});
