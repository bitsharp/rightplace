import { parseInsertedDm } from './realtime';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  thread_id: 't1',
  sender_id: 'amico',
  text: 'ciao',
  created_at: '2026-11-24T20:00:00Z',
  ...overrides,
});

describe('parseInsertedDm', () => {
  it('converte l’INSERT di un messaggio ricevuto', () => {
    expect(parseInsertedDm(row(), 't1', 'me')).toEqual({
      id: 'm1',
      senderId: 'amico',
      isMine: false,
      text: 'ciao',
      createdAt: '2026-11-24T20:00:00Z',
    });
  });

  it('riconosce i miei messaggi', () => {
    expect(parseInsertedDm(row({ sender_id: 'me' }), 't1', 'me')?.isMine).toBe(true);
  });

  it('ignora un altro thread o un payload malformato', () => {
    expect(parseInsertedDm(row({ thread_id: 't2' }), 't1', 'me')).toBeNull();
    expect(parseInsertedDm({ id: 'm1' }, 't1', 'me')).toBeNull();
    expect(parseInsertedDm(null, 't1', 'me')).toBeNull();
  });
});
