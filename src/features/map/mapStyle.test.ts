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

describe('mapAppearance', () => {
  it('forza il tema scuro su iOS e lo stile custom su Android', () => {
    expect(mapAppearance).toEqual({ userInterfaceStyle: 'dark', customMapStyle: darkMapStyle });
  });
});
