import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, pickLanguage, type Language } from './domain/pickLanguage';
import { loadStoredLanguage, saveLanguage } from './languageStorage';
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources';

export const i18n = createInstance();

function deviceLanguageCodes(): (string | null)[] {
  return getLocales().map((locale) => locale.languageCode);
}

export async function initI18n(): Promise<void> {
  const language = pickLanguage({
    stored: await loadStoredLanguage(),
    deviceLanguageCodes: deviceLanguageCodes(),
  });
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    return;
  }
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NAMESPACE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function changeLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
}
