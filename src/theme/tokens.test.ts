import { colors, heights, radius, spacing, withAlpha } from './tokens';

describe('theme tokens', () => {
  it('riprende i colori del mock-up', () => {
    expect(colors).toMatchObject({
      background: '#0B0B12',
      surface: '#15151F',
      border: '#2A2A3A',
      going: '#B14CFF',
      maybe: '#4ED9C7',
      primary: '#B14CFF',
      secondary: '#4ED9C7',
      text: '#F2F1F8',
      textSecondary: '#A3A1B8',
      female: '#F2B1CB',
      male: '#86B6E3',
    });
  });

  it('usa una scala di spaziature da 4 a 32', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 20, 24, 32]);
  });

  it('fissa raggi e altezze del mock-up', () => {
    expect(radius).toMatchObject({
      card: 20,
      cardLarge: 24,
      button: 14,
      segmented: 12,
      pill: 999,
    });
    expect(heights).toMatchObject({
      button: 56,
      buttonMedium: 44,
      field: 52,
      segmented: 36,
      tabBar: 72,
    });
  });
});

describe('withAlpha', () => {
  it('aggiunge l’opacità in esadecimale come nel mock-up', () => {
    expect(withAlpha('#B14CFF', 0.2)).toBe('#B14CFF33');
    expect(withAlpha('#4ED9C7', 0.1)).toBe('#4ED9C71A');
    expect(withAlpha('#B14CFF', 0.4)).toBe('#B14CFF66');
  });
});
