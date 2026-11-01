import { MIN_PASSWORD_LENGTH, isPasswordValid, passwordStrength } from './password';

describe('password', () => {
  it('richiede almeno 8 caratteri', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(isPasswordValid('1234567')).toBe(false);
    expect(isPasswordValid('12345678')).toBe(true);
  });

  it('non conta gli spazi iniziali e finali', () => {
    expect(isPasswordValid('   abcde   ')).toBe(false);
  });

  it('valuta debole una password corta o di un solo tipo di carattere', () => {
    expect(passwordStrength('')).toBe('weak');
    expect(passwordStrength('abcdefgh')).toBe('weak');
  });

  it('valuta discreta una password lunga il giusto con almeno due tipi di carattere', () => {
    expect(passwordStrength('serata24')).toBe('fair');
  });

  it('valuta forte una password lunga e varia', () => {
    expect(passwordStrength('Serata-Navigli-2026')).toBe('strong');
  });
});
