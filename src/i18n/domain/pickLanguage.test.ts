import { isSupportedLanguage, pickLanguage } from './pickLanguage';

describe('pickLanguage', () => {
  it('usa la lingua scelta dall’utente anche se il device è in un’altra lingua', () => {
    expect(pickLanguage({ stored: 'en', deviceLanguageCodes: ['it'] })).toBe('en');
  });

  it('segue il device quando non c’è una scelta salvata', () => {
    expect(pickLanguage({ stored: null, deviceLanguageCodes: ['it'] })).toBe('it');
  });

  it('prende la prima lingua supportata tra quelle preferite del device', () => {
    expect(pickLanguage({ stored: null, deviceLanguageCodes: ['es', 'it', 'en'] })).toBe('it');
  });

  it('ripiega sull’inglese quando nessuna lingua del device è supportata', () => {
    expect(pickLanguage({ stored: null, deviceLanguageCodes: ['es', 'fr'] })).toBe('en');
    expect(pickLanguage({ stored: null, deviceLanguageCodes: [] })).toBe('en');
  });

  it('ignora una scelta salvata non supportata', () => {
    expect(pickLanguage({ stored: 'es', deviceLanguageCodes: ['it'] })).toBe('it');
  });
});

describe('isSupportedLanguage', () => {
  it('riconosce solo it ed en', () => {
    expect(isSupportedLanguage('it')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('es')).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });
});
