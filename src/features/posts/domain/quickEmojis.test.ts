import {
  clampCommentLength,
  commentLength,
  insertAtSelection,
  MAX_COMMENT_LENGTH,
  QUICK_EMOJIS,
} from './quickEmojis';

const FAMILY = '👨‍👩‍👧';
const HEART = '❤️';
const FLAG = '🇮🇹';

describe('QUICK_EMOJIS', () => {
  it('sono le otto emoji rapide, nell’ordine di Instagram', () => {
    expect(QUICK_EMOJIS.map((item) => item.emoji)).toEqual([
      '❤️',
      '🙌',
      '🔥',
      '👏',
      '😢',
      '😍',
      '😮',
      '😂',
    ]);
  });
});

describe('commentLength', () => {
  it('conta i code point come il server', () => {
    expect(commentLength('ciao')).toBe(4);
    expect(commentLength('😂')).toBe(1);
    expect(commentLength('a😂b')).toBe(3);
  });

  it('un’emoji composta vale tutti i suoi code point (famiglia = 5)', () => {
    expect(commentLength(FAMILY)).toBe(5);
  });

  it('il cuore col selettore di variante vale 2, una bandiera 2', () => {
    expect(commentLength(HEART)).toBe(2);
    expect(commentLength(FLAG)).toBe(2);
  });

  it('coincide con Array.from, non con la length UTF-16', () => {
    expect(commentLength('😂😂')).toBe(2);
    expect('😂😂'.length).toBe(4);
  });
});

describe('clampCommentLength', () => {
  it('lascia intatto un testo entro il limite', () => {
    expect(clampCommentLength('ciao 😂')).toBe('ciao 😂');
  });

  it('taglia a 300 code point senza spezzare una coppia surrogata', () => {
    const clamped = clampCommentLength('😂'.repeat(MAX_COMMENT_LENGTH + 5));
    expect(commentLength(clamped)).toBe(MAX_COMMENT_LENGTH);
    expect(clamped).toBe('😂'.repeat(MAX_COMMENT_LENGTH));
  });

  it('300 emoji (600 unità UTF-16) sono accettate', () => {
    const text = '🔥'.repeat(MAX_COMMENT_LENGTH);
    expect(clampCommentLength(text)).toBe(text);
  });
});

describe('insertAtSelection', () => {
  it('inserisce nella posizione del cursore', () => {
    expect(insertAtSelection('ciao mondo', { start: 4, end: 4 }, '🔥')).toEqual({
      text: 'ciao🔥 mondo',
      cursor: 6,
    });
  });

  it('sostituisce il testo selezionato', () => {
    expect(insertAtSelection('ciao mondo', { start: 5, end: 10 }, '😍')).toEqual({
      text: 'ciao 😍',
      cursor: 7,
    });
  });

  it('senza selezione inserisce in coda', () => {
    expect(insertAtSelection('ciao', null, '🙌')).toEqual({ text: 'ciao🙌', cursor: 6 });
  });

  it('il cursore avanza dell’intera emoji composta', () => {
    expect(insertAtSelection('', null, HEART).cursor).toBe(2);
  });

  it('una selezione oltre la fine del testo cade in coda', () => {
    expect(insertAtSelection('ab', { start: 9, end: 9 }, '😂').text).toBe('ab😂');
  });
});
