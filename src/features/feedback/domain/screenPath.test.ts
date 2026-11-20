import { normalizeScreenPath } from './screenPath';

describe('normalizeScreenPath', () => {
  it('lascia invariati i percorsi statici', () => {
    expect(normalizeScreenPath('/map')).toBe('/map');
    expect(normalizeScreenPath('/post/new')).toBe('/post/new');
    expect(normalizeScreenPath('/creator/new-event')).toBe('/creator/new-event');
  });

  it('sostituisce un uuid con [id]', () => {
    expect(normalizeScreenPath('/venue/3f2b8c1e-9a4d-4e0b-8f6a-1c2d3e4f5a6b')).toBe('/venue/[id]');
  });

  it('sostituisce il segmento dinamico delle rotte note, anche se non è un uuid', () => {
    expect(normalizeScreenPath('/u/lince.rosso')).toBe('/u/[id]');
    expect(normalizeScreenPath('/story/abc')).toBe('/story/[id]');
    expect(normalizeScreenPath('/creator/edit-event/42')).toBe('/creator/edit-event/[id]');
  });

  it('sostituisce i segmenti solo numerici e normalizza ogni livello', () => {
    expect(normalizeScreenPath('/night/12345/chat')).toBe('/night/[id]/chat');
  });

  it('ignora query string, hash e slash finale', () => {
    expect(normalizeScreenPath('/venue/abc/?ref=x#top')).toBe('/venue/[id]');
  });

  it('la radice resta "/"', () => {
    expect(normalizeScreenPath('/')).toBe('/');
    expect(normalizeScreenPath('')).toBe('/');
  });

  it('non supera i 200 caratteri accettati dal server', () => {
    expect(normalizeScreenPath(`/${'a'.repeat(500)}`).length).toBeLessThanOrEqual(200);
  });
});
