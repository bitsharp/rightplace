import { activeMentionQuery, insertMention, suggestMentions, unknownMentions } from './mentions';

describe('activeMentionQuery', () => {
  it.each([
    ['ciao @li', 8, 'li'],
    ['@', 1, ''],
    ['@lince.ro', 9, 'lince.ro'],
    ['ehi @lince.rosso come va', 16, 'lince.rosso'],
  ])('in "%s" col cursore a %i cerca "%s"', (text, cursor, expected) => {
    expect(activeMentionQuery(text, cursor)).toBe(expected);
  });

  it.each([
    ['ciao', 4],
    ['mail@dominio', 12],
    ['ciao @lince e poi', 17],
    ['@lince ', 7],
  ])('in "%s" col cursore a %i non c\'è nessuna menzione attiva', (text, cursor) => {
    expect(activeMentionQuery(text, cursor)).toBeNull();
  });
});

describe('suggestMentions', () => {
  const following = ['lince.rosso', 'lupo.nero', 'volpe.viola', 'Lontra.blu'];

  it('propone solo chi seguo, per prefisso e senza badare alle maiuscole', () => {
    expect(suggestMentions('l', following)).toEqual(['lince.rosso', 'lupo.nero', 'Lontra.blu']);
    expect(suggestMentions('LU', following)).toEqual(['lupo.nero']);
  });

  it('non propone nessuno che non seguo', () => {
    expect(suggestMentions('orso', following)).toEqual([]);
  });

  it('con "@" da solo mostra i primi seguiti, fino al limite', () => {
    expect(suggestMentions('', following, 2)).toEqual(['lince.rosso', 'lupo.nero']);
  });

  it('il limite predefinito è 5', () => {
    const many = Array.from({ length: 8 }, (_, i) => `animale.c${i}`);
    expect(suggestMentions('', many)).toHaveLength(5);
  });
});

describe('insertMention', () => {
  it("sostituisce la query con l'handle completo e porta il cursore dopo lo spazio (senza raddoppiarlo)", () => {
    expect(insertMention('ciao @li come va', 8, 'lince.rosso')).toEqual({
      text: 'ciao @lince.rosso come va',
      cursor: 18,
    });
  });

  it('a fine testo aggiunge uno spazio', () => {
    expect(insertMention('@lu', 3, 'lupo.nero')).toEqual({ text: '@lupo.nero ', cursor: 11 });
  });
});

describe('unknownMentions', () => {
  it('restituisce gli handle taggati che non seguo, una volta sola', () => {
    const text = 'ehi @orso.verde e @lince.rosso, @orso.verde di nuovo';
    expect(unknownMentions(text, ['lince.rosso'], 'volpe.viola')).toEqual(['orso.verde']);
  });

  it('ignora me stesso e le email', () => {
    expect(unknownMentions('@volpe.viola scrivi a x@orso.verde', [], 'volpe.viola')).toEqual([]);
  });

  it('non fa differenza tra maiuscole e minuscole', () => {
    expect(unknownMentions('@Lince.Rosso', ['lince.rosso'], 'me.me')).toEqual([]);
  });
});
