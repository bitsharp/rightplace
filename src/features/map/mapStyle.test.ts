import { colors } from '@/theme/tokens';

import { darkMapStyle, mapAppearance } from './mapStyle';

type Styler = Record<string, unknown>;
const asStyler = (styler: object) => styler as Styler;

const rule = (featureType: string | undefined, elementType: string) =>
  darkMapStyle.find(
    (entry) => entry.featureType === featureType && entry.elementType === elementType,
  );
const stylerOf = (featureType: string | undefined, elementType: string, key: string) =>
  rule(featureType, elementType)?.stylers.find((styler) => key in asStyler(styler)) as
    Record<string, unknown> | undefined;
const colorOf = (featureType: string | undefined, elementType: string) =>
  (stylerOf(featureType, elementType, 'color')?.color as string | undefined) ?? '';
const channels = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
};
const light = (hex: string) => {
  const { r, g, b } = channels(hex);
  return r + g + b;
};
const isOff = (featureType: string | undefined, elementType: string) =>
  rule(featureType, elementType)?.stylers.some(
    (styler: object) => asStyler(styler).visibility === 'off',
  ) === true;

describe('darkMapStyle: terreno quasi nero', () => {
  it('usa lo sfondo della mappa del mock-up per il terreno', () => {
    expect(colorOf('landscape', 'geometry')).toBe(colors.mapCanvas);
  });

  it('acqua, parchi e confini sono neri come lo sfondo', () => {
    expect(colorOf('water', 'geometry')).toBe(colors.background);
    expect(colorOf('poi.park', 'geometry')).toBe(colors.background);
    expect(colorOf('administrative', 'geometry')).toBe(colors.background);
  });

  it('nessuna superficie del terreno supera il grigio quasi nero', () => {
    for (const feature of ['landscape', 'water', 'poi.park', 'administrative']) {
      expect(light(colorOf(feature, 'geometry'))).toBeLessThan(0x60);
    }
  });
});

describe('darkMapStyle: strade viola luminose con gerarchia', () => {
  it.each(['road.highway', 'road.arterial', 'road.local'])(
    'le strade (%s) sono viola: blu e rosso prevalgono sul verde',
    (featureType) => {
      const { r, g, b } = channels(colorOf(featureType, 'geometry'));
      expect(b).toBeGreaterThan(g);
      expect(r).toBeGreaterThan(g);
    },
  );

  it('principali più accese delle secondarie, queste più delle locali', () => {
    const highway = light(colorOf('road.highway', 'geometry'));
    const arterial = light(colorOf('road.arterial', 'geometry'));
    const local = light(colorOf('road.local', 'geometry'));
    expect(highway).toBeGreaterThan(arterial);
    expect(arterial).toBeGreaterThan(local);
  });

  it('la strada principale è viola acceso, vicina al primario', () => {
    expect(light(colorOf('road.highway', 'geometry'))).toBeGreaterThan(light(colors.primary) * 0.7);
  });

  it('le strade locali sono sottili e le principali più larghe', () => {
    const weight = (feature: string) =>
      (stylerOf(feature, 'geometry', 'weight')?.weight as number | undefined) ?? 1;
    expect(weight('road.local')).toBeLessThan(weight('road.highway'));
  });
});

describe('darkMapStyle: niente POI, niente icone, etichette quasi assenti', () => {
  it('nasconde tutti i punti d’interesse: sulla mappa ci sono solo i nostri locali', () => {
    expect(isOff('poi', 'all')).toBe(true);
    expect(isOff(undefined, 'labels.icon')).toBe(true);
    expect(isOff('transit', 'all')).toBe(true);
  });

  it('nessuna regola riaccende etichette o icone dei POI', () => {
    const poiLabels = darkMapStyle.filter(
      (entry) =>
        entry.featureType?.startsWith('poi') &&
        entry.elementType !== 'geometry' &&
        entry.stylers.some((styler: object) => asStyler(styler).visibility === 'on'),
    );
    expect(poiLabels).toEqual([]);
  });

  it('nasconde i nomi dei luoghi e delle strade locali', () => {
    expect(isOff(undefined, 'labels')).toBe(true);
    expect(isOff('road.local', 'labels')).toBe(true);
  });

  it('lascia solo i nomi delle vie principali, molto attenuati', () => {
    const label = colorOf('road.highway', 'labels.text.fill');
    expect(light(label)).toBeGreaterThan(0);
    expect(light(label)).toBeLessThan(light(colors.textSecondary) * 0.6);
    expect(colorOf('road.highway', 'labels.text.stroke')).toBe(colors.background);
  });
});

describe('mapAppearance', () => {
  it('forza il tema scuro su iOS e lo stile custom su Android', () => {
    expect(mapAppearance).toEqual({ userInterfaceStyle: 'dark', customMapStyle: darkMapStyle });
  });
});
