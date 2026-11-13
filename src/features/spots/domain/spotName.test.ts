import { validateSpotName } from './spotName';

describe('validateSpotName', () => {
  it('accetta un nome normale e ignora gli spazi attorno', () => {
    expect(validateSpotName('Casa di Anna')).toBe('ok');
    expect(validateSpotName('  Casa di Anna  ')).toBe('ok');
  });

  it('rifiuta nomi sotto i 3 caratteri, spazi esclusi', () => {
    expect(validateSpotName('')).toBe('tooShort');
    expect(validateSpotName('ab')).toBe('tooShort');
    expect(validateSpotName('  ab  ')).toBe('tooShort');
    expect(validateSpotName('abc')).toBe('ok');
  });

  it('rifiuta nomi sopra i 40 caratteri', () => {
    expect(validateSpotName('x'.repeat(40))).toBe('ok');
    expect(validateSpotName('x'.repeat(41))).toBe('tooLong');
  });

  it('conta i caratteri come il database, non le unità UTF-16', () => {
    expect(validateSpotName('🎉'.repeat(40))).toBe('ok');
    expect(validateSpotName('🎉'.repeat(41))).toBe('tooLong');
  });

  it('rifiuta le menzioni', () => {
    expect(validateSpotName('@mario party')).toBe('noMentions');
    expect(validateSpotName('festa da @anna')).toBe('noMentions');
  });

  it('rifiuta link e domini, con o senza schema', () => {
    for (const name of [
      'vai su http://x.it',
      'https://x.it',
      'www.sito',
      'sito.COM',
      'casa a.it/x',
    ]) {
      expect(validateSpotName(name)).toBe('noLinks');
    }
  });

  it('non scambia punteggiatura normale per un link', () => {
    expect(validateSpotName('Casa di Anna.')).toBe('ok');
    expect(validateSpotName('Sala 3.5 al mare')).toBe('ok');
  });
});
