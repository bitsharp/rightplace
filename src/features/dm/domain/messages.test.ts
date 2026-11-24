import { appendDm, withDaySeparators, type DmMessage } from './messages';

const message = (id: string, createdAt: string, overrides: Partial<DmMessage> = {}): DmMessage => ({
  id,
  senderId: 'amico',
  isMine: false,
  text: id,
  createdAt,
  ...overrides,
});

describe('appendDm', () => {
  it('inserisce il messaggio in cima (più recente prima)', () => {
    const list = [message('a', '2026-11-24T12:00:00Z')];
    expect(appendDm(list, message('b', '2026-11-24T12:05:00Z')).map((m) => m.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('non duplica un messaggio già presente (realtime + risposta della RPC)', () => {
    const list = [message('a', '2026-11-24T12:00:00Z')];
    expect(appendDm(list, message('a', '2026-11-24T12:00:00Z'))).toBe(list);
  });
});

describe('withDaySeparators', () => {
  it('mette un separatore sopra il primo messaggio di ogni giorno (lista dal più recente)', () => {
    const items = withDaySeparators([
      message('c', '2026-11-24T12:00:00Z'),
      message('b', '2026-11-23T12:30:00Z'),
      message('a', '2026-11-23T12:00:00Z'),
    ]);
    expect(items.map((item) => (item.type === 'day' ? 'day' : item.message.id))).toEqual([
      'c',
      'day',
      'b',
      'a',
      'day',
    ]);
  });

  it('con nessun messaggio non produce nulla', () => {
    expect(withDaySeparators([])).toEqual([]);
  });
});
