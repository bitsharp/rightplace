import { isSearchable, normalizeSearchQuery } from './searchQuery';

describe('normalizeSearchQuery', () => {
  it('toglie spazi e @ iniziale e porta in minuscolo', () => {
    expect(normalizeSearchQuery('  @Volpe ')).toBe('volpe');
  });

  it("mantiene underscore e cifre degli handle scelti dall'utente", () => {
    expect(normalizeSearchQuery('@Luca_97')).toBe('luca_97');
  });
});

describe('isSearchable', () => {
  it('richiede almeno due caratteri', () => {
    expect(isSearchable('v')).toBe(false);
    expect(isSearchable('@v')).toBe(false);
    expect(isSearchable('vo')).toBe(true);
    expect(isSearchable('@vo')).toBe(true);
  });

  it('una query vuota o di soli spazi non è cercabile', () => {
    expect(isSearchable('   ')).toBe(false);
  });
});
