export const SUPPORTED_LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';

export function isSupportedLanguage(code: string | null | undefined): code is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === code);
}

type LanguageSources = {
  stored: string | null;
  deviceLanguageCodes: readonly (string | null)[];
};

export function pickLanguage({ stored, deviceLanguageCodes }: LanguageSources): Language {
  if (isSupportedLanguage(stored)) return stored;
  return deviceLanguageCodes.find(isSupportedLanguage) ?? FALLBACK_LANGUAGE;
}
