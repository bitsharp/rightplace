import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { getLocales, useLocales } from 'expo-localization';

import { deviceLocales as locales } from '@/test/locales';

import { i18n, initI18n } from './index';
import { useDeviceLanguageSync } from './useDeviceLanguageSync';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(), useLocales: jest.fn() }));

describe('useDeviceLanguageSync', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(getLocales).mockReturnValue(locales('it'));
    await initI18n();
  });

  it('segue la nuova lingua del device se l’utente non ne ha scelta una', async () => {
    jest.mocked(useLocales).mockReturnValue(locales('en'));
    renderHook(() => useDeviceLanguageSync());
    await waitFor(() => expect(i18n.language).toBe('en'));
  });

  it('mantiene la lingua scelta dall’utente anche se il device cambia', async () => {
    await AsyncStorage.setItem('rightplace.language', 'en');
    await initI18n();
    const changeLanguage = jest.spyOn(i18n, 'changeLanguage');
    jest.mocked(useLocales).mockReturnValue(locales('it'));
    renderHook(() => useDeviceLanguageSync());
    await waitFor(() => expect(i18n.language).toBe('en'));
    expect(changeLanguage).not.toHaveBeenCalledWith('it');
  });
});
