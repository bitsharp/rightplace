import type { Locale } from 'expo-localization';

// Test-only factory: a device locale where only the language matters.
export function deviceLocales(languageCode: string): [Locale] {
  return [
    {
      languageTag: languageCode,
      languageCode,
      languageScriptCode: null,
      regionCode: null,
      languageRegionCode: null,
      currencyCode: null,
      currencySymbol: null,
      languageCurrencyCode: null,
      languageCurrencySymbol: null,
      decimalSeparator: null,
      digitGroupingSeparator: null,
      textDirection: 'ltr',
      measurementSystem: null,
      temperatureUnit: null,
    },
  ];
}
