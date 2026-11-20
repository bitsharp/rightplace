import { websiteDomain } from './website';

describe('websiteDomain', () => {
  it('mostra il dominio così com’è, www compreso', () => {
    expect(websiteDomain('https://www.locale.it/')).toBe('www.locale.it');
    expect(websiteDomain('http://locale.it')).toBe('locale.it');
  });

  it('toglie percorso, query, frammento, porta e credenziali', () => {
    expect(websiteDomain('https://www.locale.it/eventi?x=1#top')).toBe('www.locale.it');
    expect(websiteDomain('https://locale.it:8443/a')).toBe('locale.it');
    expect(websiteDomain('https://utente:pw@locale.it/a')).toBe('locale.it');
  });

  it('un indirizzo non http(s) o senza host non ha dominio', () => {
    expect(websiteDomain('javascript:alert(1)')).toBeNull();
    expect(websiteDomain('tel:+39021234')).toBeNull();
    expect(websiteDomain('https://')).toBeNull();
    expect(websiteDomain('')).toBeNull();
  });
});
