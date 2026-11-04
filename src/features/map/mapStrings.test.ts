import { resources } from '@/i18n/resources';

const MAP_KEYS = [
  'searchPlaceholder',
  'view.general',
  'view.friends',
  'hint.general',
  'hint.friends',
  'legend.tonight',
  'legend.usually',
  'banner.typicalOnly',
  'banner.empty',
  'pill.text',
  'pill.a11y',
  'cards.history',
  'cards.hot',
  'cards.tonightBand',
  'friendsEmpty',
  'loadError',
  'mapA11y',
];
const UI_KEYS = [
  'typical.quiet',
  'typical.lively',
  'typical.packed',
  'typical.usually',
  'typical.a11y',
];

function read(language: 'it' | 'en', namespace: 'map' | 'ui', key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      resources[language][namespace],
    );
}

const placeholders = (text: unknown) =>
  String(text)
    .match(/{{\w+}}/g)
    ?.sort() ?? [];

describe('stringhe della mappa', () => {
  it.each([
    ...MAP_KEYS.map((key) => ['map', key] as const),
    ...UI_KEYS.map((key) => ['ui', key] as const),
  ])('%s:%s esiste in italiano e in inglese, con gli stessi segnaposto', (namespace, key) => {
    const italian = read('it', namespace, key);
    const english = read('en', namespace, key);
    expect(typeof italian).toBe('string');
    expect(typeof english).toBe('string');
    expect(placeholders(english)).toEqual(placeholders(italian));
  });

  it('nessuna stringa della mappa nomina Google per lo strato "di solito"', () => {
    const texts = [
      ...UI_KEYS.map((key) => read('it', 'ui', key)),
      ...MAP_KEYS.map((key) => read('en', 'map', key)),
    ];
    expect(texts.join(' ')).not.toMatch(/google/i);
  });
});
