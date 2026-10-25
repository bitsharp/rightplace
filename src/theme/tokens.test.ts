import { colors, layout } from './tokens';

describe('theme tokens', () => {
  it('riprende i colori del mock-up', () => {
    expect(colors).toMatchObject({
      background: '#0B0B12',
      surface: '#15151F',
      border: '#2A2A3A',
      primary: '#9D6BFF',
      secondary: '#4ED9C7',
      text: '#F2F1F8',
      textSecondary: '#A3A1B8',
      genderFemale: '#F2B1CB',
      genderMale: '#86B6E3',
    });
  });

  it('fissa l’altezza della tab bar a 72 come nel mock-up', () => {
    expect(layout.tabBarHeight).toBe(72);
  });
});
