import { useLocales } from 'expo-localization';
import { useEffect } from 'react';

import { pickLanguage } from './domain/pickLanguage';
import { i18n } from './index';
import { loadStoredLanguage } from './languageStorage';

// Android keeps the app alive on a system language change, so the UI must follow it live.
export function useDeviceLanguageSync(): void {
  const locales = useLocales();

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const language = pickLanguage({
        stored: await loadStoredLanguage(),
        deviceLanguageCodes: locales.map((locale) => locale.languageCode),
      });
      if (!cancelled && language !== i18n.language) await i18n.changeLanguage(language);
    };
    sync().catch((error: unknown) => console.warn('Sincronizzazione lingua fallita', error));
    return () => {
      cancelled = true;
    };
  }, [locales]);
}
