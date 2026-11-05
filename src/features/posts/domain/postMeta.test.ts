import { postMetaText } from './postMeta';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}${JSON.stringify(options)}` : key;
const NOW = new Date(2026, 10, 9, 10, 0, 0);

describe('postMetaText', () => {
  it('locale e "ieri sera" il giorno dopo', () => {
    expect(postMetaText(t, { venueName: 'Arena Club', nightDate: '2026-11-08' }, NOW)).toBe(
      'meta.lastNight{"venue":"Arena Club"}',
    );
  });

  it('stasera, per il mio post pubblicato durante la serata', () => {
    const night = new Date(2026, 10, 8, 23, 0, 0);
    expect(postMetaText(t, { venueName: 'Arena Club', nightDate: '2026-11-08' }, night)).toBe(
      'meta.tonight{"venue":"Arena Club"}',
    );
  });

  it('più indietro nel tempo conta i giorni (plurale via i18n)', () => {
    expect(postMetaText(t, { venueName: 'Arena Club', nightDate: '2026-11-06' }, NOW)).toBe(
      'meta.daysAgo{"venue":"Arena Club","count":3}',
    );
  });

  it('senza data mostra solo il locale; senza locale un testo neutro', () => {
    expect(postMetaText(t, { venueName: 'Arena Club', nightDate: null }, NOW)).toBe(
      'meta.venueOnly{"venue":"Arena Club"}',
    );
    expect(postMetaText(t, { venueName: null, nightDate: null }, NOW)).toBe('meta.unknown');
  });
});
