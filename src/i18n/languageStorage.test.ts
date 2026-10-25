import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadStoredLanguage, saveLanguage } from './languageStorage';

describe('languageStorage', () => {
  beforeEach(() => AsyncStorage.clear());

  it('non restituisce nulla se l’utente non ha mai scelto', async () => {
    await expect(loadStoredLanguage()).resolves.toBeNull();
  });

  it('ricorda la lingua scelta', async () => {
    await saveLanguage('en');
    await expect(loadStoredLanguage()).resolves.toBe('en');
  });
});
