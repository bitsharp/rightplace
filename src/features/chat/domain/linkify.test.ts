import { isOpenableUrl, linkify } from './linkify';

const link = (text: string, url: string) => ({ kind: 'link', text, url });
const plain = (text: string) => ({ kind: 'text', text });

describe('linkify', () => {
  it('lascia intatto un testo senza link', () => {
    expect(linkify('ci vediamo alle 23')).toEqual([plain('ci vediamo alle 23')]);
  });

  it('restituisce nessun segmento per il testo vuoto', () => {
    expect(linkify('')).toEqual([]);
  });

  it('riconosce un link http(s) in mezzo al testo', () => {
    expect(linkify('guarda https://example.com/a?b=1 ora')).toEqual([
      plain('guarda '),
      link('https://example.com/a?b=1', 'https://example.com/a?b=1'),
      plain(' ora'),
    ]);
  });

  it('riconosce http e lo schema scritto in maiuscolo', () => {
    expect(linkify('HTTP://Example.com')).toEqual([
      link('HTTP://Example.com', 'HTTP://Example.com'),
    ]);
  });

  it('aggiunge https:// ai link che iniziano con www.', () => {
    expect(linkify('www.example.com/biglietti')).toEqual([
      link('www.example.com/biglietti', 'https://www.example.com/biglietti'),
    ]);
  });

  it.each([
    ['vai su https://example.com.', 'https://example.com', '.'],
    ['https://example.com, poi', 'https://example.com', ', poi'],
    ['(https://example.com)', 'https://example.com', ')'],
    ['https://example.com!', 'https://example.com', '!'],
    ['esiste https://example.com?', 'https://example.com', '?'],
    ['https://example.com/a),', 'https://example.com/a', '),'],
  ])('non include la punteggiatura finale in "%s"', (text, url, tail) => {
    const segments = linkify(text);
    expect(segments).toContainEqual(link(url, url));
    expect(segments.at(-1)).toEqual(plain(tail));
  });

  it("tiene la parentesi chiusa quando fa parte dell'indirizzo", () => {
    const url = 'https://it.wikipedia.org/wiki/Milano_(citta)';
    expect(linkify(`leggi ${url}`)).toContainEqual(link(url, url));
  });

  it('riconosce più link nello stesso messaggio', () => {
    const urls = linkify('https://a.com e www.b.com').filter((s) => s.kind === 'link');
    expect(urls.map((s) => s.kind === 'link' && s.url)).toEqual([
      'https://a.com',
      'https://www.b.com',
    ]);
  });

  it('riconosce un link su più righe', () => {
    expect(linkify('ecco\nwww.a.com\nciao')).toEqual([
      plain('ecco\n'),
      link('www.a.com', 'https://www.a.com'),
      plain('\nciao'),
    ]);
  });

  it.each([
    'javascript:alert(1)',
    'intent://scan/#Intent;scheme=zxing;end',
    'tel:+390212345',
    'mailto:a@b.it',
    'ftp://example.com',
    'data:text/html;base64,AAAA',
    'file:///etc/passwd',
  ])('non trasforma in link %s', (text) => {
    expect(linkify(text).every((segment) => segment.kind === 'text')).toBe(true);
  });

  it('non trasforma in link uno schema pericoloso nascosto dentro un altro testo', () => {
    expect(linkify('xhttps://example.com').every((s) => s.kind === 'text')).toBe(true);
    expect(linkify('javascript:https://example.com')).toEqual([
      plain('javascript:https://example.com'),
    ]);
  });

  it('non è un link se manca il dominio', () => {
    expect(linkify('https:// www. http://')).toEqual([plain('https:// www. http://')]);
  });

  it('lascia intatte le menzioni @handle', () => {
    expect(linkify('ciao @lince.rosso ci sei?')).toEqual([plain('ciao @lince.rosso ci sei?')]);
  });

  it('non crea un link da un @handle che sembra un indirizzo', () => {
    expect(
      linkify('scrivi a @www.rosso o a mario@www.example.com').every((s) => s.kind === 'text'),
    ).toBe(true);
  });

  it('riconosce un link subito dopo una menzione', () => {
    expect(linkify('@lince.rosso www.a.com')).toEqual([
      plain('@lince.rosso '),
      link('www.a.com', 'https://www.a.com'),
    ]);
  });

  it('i segmenti rimessi insieme ridanno il testo originale', () => {
    const text = 'a https://x.com/y, b www.z.it! (c) @mario';
    expect(
      linkify(text)
        .map((segment) => segment.text)
        .join(''),
    ).toBe(text);
  });
});

describe('isOpenableUrl', () => {
  it('accetta solo http e https', () => {
    expect(isOpenableUrl('https://example.com')).toBe(true);
    expect(isOpenableUrl('http://example.com')).toBe(true);
    expect(isOpenableUrl('HTTPS://example.com')).toBe(true);
    expect(isOpenableUrl('javascript:alert(1)')).toBe(false);
    expect(isOpenableUrl('intent://x')).toBe(false);
    expect(isOpenableUrl('tel:+39021234')).toBe(false);
    expect(isOpenableUrl(' https://example.com')).toBe(false);
    expect(isOpenableUrl('www.example.com')).toBe(false);
  });
});

describe('linkify: emoji', () => {
  it('un testo di sole emoji resta testo intero', () => {
    expect(linkify('👨‍👩‍👧 🇮🇹 ❤️ 😂')).toEqual([{ kind: 'text', text: '👨‍👩‍👧 🇮🇹 ❤️ 😂' }]);
  });

  it('un’emoji prima del link non lo rompe e non si spezza', () => {
    expect(linkify('🔥 https://example.com/a 😂')).toEqual([
      { kind: 'text', text: '🔥 ' },
      { kind: 'link', text: 'https://example.com/a', url: 'https://example.com/a' },
      { kind: 'text', text: ' 😂' },
    ]);
  });
});

describe('linkify: emoji attaccata al link', () => {
  it('l’emoji subito dopo l’indirizzo resta testo e il link funziona', () => {
    expect(linkify('www.example.com🔥 ok')).toEqual([
      { kind: 'link', text: 'www.example.com', url: 'https://www.example.com' },
      { kind: 'text', text: '🔥 ok' },
    ]);
  });

  it('anche un’emoji composta (famiglia, bandiera, cuore con variante)', () => {
    for (const emoji of ['👨‍👩‍👧', '🇮🇹', '❤️']) {
      expect(linkify(`https://example.com${emoji}`)).toEqual([
        { kind: 'link', text: 'https://example.com', url: 'https://example.com' },
        { kind: 'text', text: emoji },
      ]);
    }
  });
});
