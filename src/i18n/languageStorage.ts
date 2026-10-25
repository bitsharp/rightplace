import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupportedLanguage, type Language } from './domain/pickLanguage';

const STORAGE_KEY = 'rightplace.language';

export async function loadStoredLanguage(): Promise<Language | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : null;
}

export async function saveLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, language);
}
