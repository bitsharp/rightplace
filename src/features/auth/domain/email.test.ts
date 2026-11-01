import { isEmailValid } from './email';

describe('isEmailValid', () => {
  it.each(['lince@example.com', ' Lince.Rosso+serata@mail.it '])('accetta %s', (email) => {
    expect(isEmailValid(email)).toBe(true);
  });

  it.each(['', 'lince', 'lince@', '@example.com', 'lince@example', 'li nce@example.com'])(
    'rifiuta "%s"',
    (email) => {
      expect(isEmailValid(email)).toBe(false);
    },
  );
});
