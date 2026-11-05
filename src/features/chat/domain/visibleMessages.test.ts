import { visibleMessages } from './visibleMessages';
import type { ChatMessage } from './messages';

const message = (id: string, userId: string): ChatMessage => ({
  id,
  userId,
  handle: `animale.${userId}`,
  kind: 'text',
  text: id,
  createdAt: '2026-11-07T22:00:00Z',
  isMine: userId === 'me',
});

describe('visibleMessages', () => {
  it('di una lista mista tiene solo i miei messaggi e quelli di chi seguo', () => {
    const list = [message('1', 'me'), message('2', 'amico'), message('3', 'sconosciuto')];
    expect(visibleMessages(list, 'me', ['amico']).map((m) => m.id)).toEqual(['1', '2']);
  });

  it('non mostra nessuno se non seguo nessuno, tranne me', () => {
    const list = [message('1', 'me'), message('2', 'sconosciuto')];
    expect(visibleMessages(list, 'me', []).map((m) => m.id)).toEqual(['1']);
  });
});
