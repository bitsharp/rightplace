import { colors, heights, radius, spacing, withAlpha } from './tokens';

describe('theme tokens', () => {
  it('riprende i colori del mock-up', () => {
    expect(colors).toMatchObject({
      background: '#0B0B12',
      surface: '#15151F',
      border: '#2A2A3A',
      going: '#9D6BFF',
      maybe: '#4ED9C7',
      primary: '#9D6BFF',
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
      card: 16,
      cardLarge: 18,
      button: 14,
      buttonLarge: 16,
      segmented: 12,
      segmentedInner: 9,
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
    expect(withAlpha('#9D6BFF', 0.2)).toBe('#9D6BFF33');
    expect(withAlpha('#4ED9C7', 0.1)).toBe('#4ED9C71A');
    expect(withAlpha('#9D6BFF', 0.4)).toBe('#9D6BFF66');
  });
});
