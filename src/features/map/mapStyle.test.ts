import { colors } from '@/theme/tokens';

import { darkMapStyle, mapAppearance } from './mapStyle';

const ruleFor = (featureType: string | undefined, elementType: string) =>
  darkMapStyle.find((rule) => rule.featureType === featureType && rule.elementType === elementType);

describe('darkMapStyle', () => {
  it('usa lo sfondo della mappa del mock-up', () => {
    expect(ruleFor(undefined, 'geometry')?.stylers).toContainEqual({ color: colors.mapCanvas });
  });

  it('scrive le etichette nel grigio secondario', () => {
    expect(ruleFor(undefined, 'labels.text.fill')?.stylers).toContainEqual({
      color: colors.textSecondary,
    });
  });

  it('nasconde i punti d’interesse commerciali di Google: sulla mappa ci sono solo i nostri locali', () => {
    expect(ruleFor('poi.business', 'all')?.stylers).toContainEqual({ visibility: 'off' });
  });
});

describe('darkMapStyle: strade viola tenue', () => {
  const colorOf = (featureType: string) =>
    ruleFor(featureType, 'geometry')?.stylers.find((styler) => 'color' in styler);
  const hue = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  };

  it.each(['road', 'road.arterial', 'road.highway'])(
    'le strade (%s) sono viola scuro: blu e rosso prevalgono sul verde, senza uguagliare il testo',
    (featureType) => {
      const value = (colorOf(featureType) as { color: string } | undefined)?.color ?? '#000000';
      const { r, g, b } = hue(value);
      expect(b).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(g);
      expect(value).not.toBe(colors.text);
    },
  );

  it('le arterie sono più chiare delle strade minori, per dare gerarchia', () => {
    const light = (featureType: string) => {
      const { r, g, b } = hue((colorOf(featureType) as { color: string }).color);
      return r + g + b;
    };
    expect(light('road.highway')).toBeGreaterThan(light('road'));
  });
});

describe('mapAppearance', () => {
  it('forza il tema scuro su iOS e lo stile custom su Android', () => {
    expect(mapAppearance).toEqual({ userInterfaceStyle: 'dark', customMapStyle: darkMapStyle });
  });
});
