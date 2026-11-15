import {
  activeMentionQuery,
  insertMention,
  mentionableHandles,
  suggestMentions,
  unknownMentions,
} from './mentions';

describe('activeMentionQuery', () => {
  it.each([
    ['ciao @li', 8, 'li'],
    ['@', 1, ''],
    ['@lince.ro', 9, 'lince.ro'],
    ['ehi @lince.rosso come va', 16, 'lince.rosso'],
    ['ehi @luca_97', 12, 'luca_97'],
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

  it('propone solo gli handle che gli vengono dati, per prefisso e senza badare alle maiuscole', () => {
    expect(suggestMentions('l', following)).toEqual(['lince.rosso', 'lupo.nero', 'Lontra.blu']);
    expect(suggestMentions('LU', following)).toEqual(['lupo.nero']);
  });

  it("non propone nessuno che non è nell'elenco", () => {
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

  it("riconosce gli handle scelti dall'utente, con underscore e cifre", () => {
    expect(unknownMentions('ciao @luca_97, @mia.rossi_2 e @zz', [], 'volpe.viola')).toEqual([
      'luca_97',
      'mia.rossi_2',
    ]);
  });

  it("non include il punto o l'underscore finali della frase", () => {
    expect(unknownMentions('grazie @luca_97.', [], 'volpe.viola')).toEqual(['luca_97']);
  });

  it('ignora me stesso e le email', () => {
    expect(unknownMentions('@volpe.viola scrivi a x@orso.verde', [], 'volpe.viola')).toEqual([]);
  });

  it('non fa differenza tra maiuscole e minuscole', () => {
    expect(unknownMentions('@Lince.Rosso', ['lince.rosso'], 'me.me')).toEqual([]);
  });
});

describe('mentionableHandles', () => {
  it('unisce gli autori visibili nella room e chi seguo, senza doppioni né me stesso', () => {
    expect(
      mentionableHandles(
        ['volpe.viola', 'Lince.Rosso', 'gatto.blu'],
        ['lince.rosso', 'lupo.nero'],
        'gatto.blu',
      ),
    ).toEqual(['volpe.viola', 'Lince.Rosso', 'lupo.nero']);
  });

  it("non inventa nessuno: senza autori né seguiti non c'è nulla da proporre", () => {
    expect(mentionableHandles([], [], 'gatto.blu')).toEqual([]);
  });
});
