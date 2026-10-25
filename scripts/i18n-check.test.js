const path = require('path');

const { findMissingKeys, flattenKeys } = require('./i18n-check');

describe('flattenKeys', () => {
  it('appiattisce le chiavi annidate con il punto', () => {
    expect(flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual(['a.b', 'a.c.d', 'e']);
  });
});

describe('findMissingKeys', () => {
  it('non segnala nulla quando le due lingue hanno le stesse chiavi', () => {
    expect(findMissingKeys({ it: { common: { a: '1' } }, en: { common: { a: '2' } } })).toEqual([]);
  });

  it('segnala una chiave presente solo in italiano', () => {
    expect(
      findMissingKeys({ it: { common: { a: '1', b: '1' } }, en: { common: { a: '2' } } }),
    ).toEqual(['en: common:b']);
  });

  it('segnala un intero namespace mancante in una lingua', () => {
    expect(
      findMissingKeys({ it: { common: { a: '1' } }, en: { common: { a: '2' }, map: { t: '3' } } }),
    ).toEqual(['it: map:t']);
  });

  it('segnala un valore vuoto come traduzione mancante', () => {
    expect(findMissingKeys({ it: { common: { a: '' } }, en: { common: { a: '2' } } })).toEqual([
      'it: common:a',
    ]);
  });
});

describe('le traduzioni del progetto', () => {
  it('hanno le stesse chiavi in italiano e inglese', () => {
    const { loadProjectLocales } = require('./i18n-check');
    expect(findMissingKeys(loadProjectLocales(path.join(__dirname, '..')))).toEqual([]);
  });
});
