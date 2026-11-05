import {
  appendMessage,
  confirmSent,
  markFailed,
  mergeFresh,
  mergeOlder,
  removeMessage,
  replacePending,
  type ChatMessage,
} from './messages';

const message = (
  id: string,
  createdAt: string,
  overrides: Partial<ChatMessage> = {},
): ChatMessage => ({
  id,
  userId: 'u1',
  handle: 'volpe.viola',
  kind: 'text',
  text: id,
  createdAt,
  isMine: false,
  ...overrides,
});

const ids = (list: ChatMessage[]) => list.map((m) => m.id);

describe('appendMessage', () => {
  it('mette il messaggio più recente in testa (lista dal più nuovo)', () => {
    const list = [message('a', '2026-11-07T22:00:00Z')];
    expect(ids(appendMessage(list, message('b', '2026-11-07T22:05:00Z')))).toEqual(['b', 'a']);
  });

  it('inserisce nel punto giusto un messaggio arrivato in ritardo', () => {
    const list = [message('c', '2026-11-07T22:10:00Z'), message('a', '2026-11-07T22:00:00Z')];
    expect(ids(appendMessage(list, message('b', '2026-11-07T22:05:00Z')))).toEqual(['c', 'b', 'a']);
  });

  it('ignora lo stesso id arrivato due volte (realtime + refetch) senza cambiare la lista', () => {
    const list = [message('a', '2026-11-07T22:00:00Z')];
    expect(appendMessage(list, message('a', '2026-11-07T22:00:00Z'))).toBe(list);
  });
});

describe('replacePending', () => {
  it('sostituisce il messaggio provvisorio con quello salvato', () => {
    const list = [message('tmp', '2026-11-07T22:05:00Z', { pending: true, isMine: true })];
    const saved = message('real', '2026-11-07T22:05:01Z', { isMine: true });
    expect(replacePending(list, 'tmp', saved)).toEqual([saved]);
  });

  it('se il realtime ha già consegnato il salvato, toglie solo il provvisorio', () => {
    const real = message('real', '2026-11-07T22:05:01Z', { isMine: true });
    const list = [real, message('tmp', '2026-11-07T22:05:00Z', { pending: true })];
    expect(ids(replacePending(list, 'tmp', real))).toEqual(['real']);
  });
});

describe('markFailed', () => {
  it('segna fallito il provvisorio e lo toglie dallo stato di invio', () => {
    const list = [message('tmp', '2026-11-07T22:05:00Z', { pending: true })];
    expect(markFailed(list, 'tmp')[0]).toMatchObject({ id: 'tmp', pending: false, failed: true });
  });
});

describe('mergeOlder', () => {
  it('accoda la pagina più vecchia senza duplicati e in ordine', () => {
    const list = [message('c', '2026-11-07T22:10:00Z'), message('b', '2026-11-07T22:05:00Z')];
    const page = [message('b', '2026-11-07T22:05:00Z'), message('a', '2026-11-07T22:00:00Z')];
    expect(ids(mergeOlder(list, page))).toEqual(['c', 'b', 'a']);
  });
});

describe('removeMessage', () => {
  it("toglie il messaggio con quell'id", () => {
    const list = [message('b', '2026-11-07T22:05:00Z'), message('a', '2026-11-07T22:00:00Z')];
    expect(ids(removeMessage(list, 'b'))).toEqual(['a']);
  });
});

describe('mergeFresh', () => {
  const fullPage = Array.from({ length: 3 }, (_, i) =>
    message(`f${i}`, `2026-11-07T22:0${9 - i}:00Z`),
  );
  const older = message('old', '2026-11-07T20:00:00Z');
  const pending = message('tmp', '2026-11-07T22:30:00Z', { pending: true });
  const failed = message('bad', '2026-11-07T22:31:00Z', { failed: true });

  it('con una pagina piena tiene anche i messaggi più vecchi già letti', () => {
    expect(ids(mergeFresh([older, ...fullPage], fullPage, 3))).toEqual(['f0', 'f1', 'f2', 'old']);
  });

  it('tiene sempre i messaggi in invio e quelli falliti', () => {
    expect(ids(mergeFresh([pending, failed], fullPage, 3))).toEqual([
      'bad',
      'tmp',
      'f0',
      'f1',
      'f2',
    ]);
  });

  it('con una pagina non piena il server non ha altro: i vecchi in cache sono superati', () => {
    expect(ids(mergeFresh([older, ...fullPage], fullPage.slice(0, 2), 3))).toEqual(['f0', 'f1']);
  });
});

describe('confirmSent', () => {
  const temp = message('tmp', '2026-11-07T22:05:00Z', {
    pending: true,
    isMine: true,
    text: 'ciao',
  });

  it('il messaggio in invio prende id e orario del server e smette di essere provvisorio', () => {
    const [saved] = confirmSent([temp], 'tmp', {
      messageId: 'real',
      createdAt: '2026-11-07T22:05:02Z',
    });
    expect(saved).toMatchObject({
      id: 'real',
      createdAt: '2026-11-07T22:05:02Z',
      pending: false,
      text: 'ciao',
      isMine: true,
    });
  });

  it("se il provvisorio non c'è più lascia la lista com'è", () => {
    const list = [message('a', '2026-11-07T22:00:00Z')];
    expect(confirmSent(list, 'tmp', { messageId: 'real', createdAt: '2026-11-07T22:05:02Z' })).toBe(
      list,
    );
  });
});
