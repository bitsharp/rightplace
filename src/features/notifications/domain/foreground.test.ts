import { shouldPresentInForeground } from './foreground';

describe('shouldPresentInForeground', () => {
  it('mostra il banner se l’utente è altrove', () => {
    expect(shouldPresentInForeground('rightplace://night/abc/chat', '/map')).toBe(true);
  });

  it('non lo mostra se l’utente è già nella chat di quella stanza', () => {
    expect(shouldPresentInForeground('rightplace://night/abc/chat', '/night/abc/chat')).toBe(false);
  });

  it('mostra il banner se è in un’altra stanza', () => {
    expect(shouldPresentInForeground('rightplace://night/abc/chat', '/night/zzz/chat')).toBe(true);
  });

  it('non mostra il promemoria della mappa mentre si è sulla mappa', () => {
    expect(shouldPresentInForeground('rightplace://map', '/map')).toBe(false);
  });

  it('senza URL, o con un URL sconosciuto che porta alla mappa, decide solo il percorso', () => {
    expect(shouldPresentInForeground(undefined, '/feed')).toBe(true);
    expect(shouldPresentInForeground('rightplace://feed', '/feed')).toBe(false);
  });
});
