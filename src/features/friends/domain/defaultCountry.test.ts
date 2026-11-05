import { resolveDefaultCountry } from './defaultCountry';

describe('resolveDefaultCountry', () => {
  it('usa la regione del telefono se è un paese supportato', () => {
    expect(resolveDefaultCountry('ES', 'IT')).toBe('ES');
    expect(resolveDefaultCountry('it', 'ES')).toBe('IT');
  });

  it('con una regione non supportata usa il paese della città selezionata', () => {
    expect(resolveDefaultCountry('GB', 'ES')).toBe('ES');
    expect(resolveDefaultCountry(null, 'ES')).toBe('ES');
  });

  it('senza indicazioni valide ripiega su IT', () => {
    expect(resolveDefaultCountry(null, null)).toBe('IT');
    expect(resolveDefaultCountry('US', 'FR')).toBe('IT');
  });
});
