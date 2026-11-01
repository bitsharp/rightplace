import { buildTurnstileHtml, parseTurnstileMessage } from './turnstile';

describe('buildTurnstileHtml', () => {
  it('carica il widget con la site key, la lingua e il tema scuro', () => {
    const html = buildTurnstileHtml({ siteKey: '1x00000000000000000000AA', language: 'en' });
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain("sitekey: '1x00000000000000000000AA'");
    expect(html).toContain("language: 'en'");
    expect(html).toContain("theme: 'dark'");
  });

  it('non permette di iniettare script dalla site key', () => {
    expect(() => buildTurnstileHtml({ siteKey: "x';alert(1);'", language: 'it' })).toThrow();
  });
});

describe('parseTurnstileMessage', () => {
  it('riconosce il token', () => {
    expect(parseTurnstileMessage('{"type":"token","token":"abc"}')).toEqual({
      type: 'token',
      token: 'abc',
    });
  });

  it('riconosce scadenza ed errore', () => {
    expect(parseTurnstileMessage('{"type":"expired"}')).toEqual({ type: 'expired' });
    expect(parseTurnstileMessage('{"type":"error"}')).toEqual({ type: 'error' });
  });

  it('ignora messaggi malformati', () => {
    expect(parseTurnstileMessage('non json')).toBeNull();
    expect(parseTurnstileMessage('{"type":"token"}')).toBeNull();
  });
});

describe('isTurnstileNavigationAllowed', () => {
  it('permette solo la pagina locale e il widget Cloudflare', () => {
    const { isTurnstileNavigationAllowed } =
      jest.requireActual<typeof import('./turnstile')>('./turnstile');
    expect(isTurnstileNavigationAllowed('about:blank')).toBe(true);
    expect(isTurnstileNavigationAllowed('https://rightplace.app/')).toBe(true);
    expect(
      isTurnstileNavigationAllowed('https://challenges.cloudflare.com/cdn-cgi/challenge'),
    ).toBe(true);
    expect(isTurnstileNavigationAllowed('https://evil.example.com/phish')).toBe(false);
    expect(isTurnstileNavigationAllowed('https://challenges.cloudflare.com.evil.com/')).toBe(false);
  });
});
