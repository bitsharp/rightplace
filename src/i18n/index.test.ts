import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { deviceLocales } from '@/test/locales';

import enCommon from './en/common.json';
import itCommon from './it/common.json';
import itUi from './it/ui.json';
import { changeLanguage, i18n, initI18n } from './index';
import { loadStoredLanguage } from './languageStorage';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const mockDeviceLanguage = (languageCode: string) =>
  jest.mocked(getLocales).mockReturnValue(deviceLocales(languageCode));

describe('initI18n', () => {
  beforeEach(() => AsyncStorage.clear());

  it('mostra i testi in italiano su un device in italiano', async () => {
    mockDeviceLanguage('it');
    await initI18n();
    expect(i18n.t('common:tabs.map')).toBe(itCommon.tabs.map);
  });

  it('mostra i testi in inglese su un device in inglese', async () => {
    mockDeviceLanguage('en');
    await initI18n();
    expect(i18n.t('common:tabs.map')).toBe(enCommon.tabs.map);
  });

  it('rispetta la lingua salvata in precedenza', async () => {
    mockDeviceLanguage('it');
    await AsyncStorage.setItem('rightplace.language', 'en');
    await initI18n();
    expect(i18n.language).toBe('en');
  });
});

describe('changeLanguage', () => {
  it('cambia lingua e la salva per i prossimi avvii', async () => {
    mockDeviceLanguage('it');
    await initI18n();
    await changeLanguage('en');
    expect(i18n.language).toBe('en');
    await expect(loadStoredLanguage()).resolves.toBe('en');
  });
});

describe('plurali', () => {
  beforeEach(() => AsyncStorage.clear());

  it.each(['it', 'en'])('usa singolare e plurale in %s', async (language) => {
    mockDeviceLanguage(language);
    await initI18n();
    expect(i18n.t('ui:friendsGoing', { count: 1 })).not.toBe(
      i18n.t('ui:friendsGoing', { count: 2 }).replace('2', '1'),
    );
  });

  it('scrive "1 amico" e "3 amici" in italiano', async () => {
    mockDeviceLanguage('it');
    await initI18n();
    expect(i18n.t('ui:friendsGoing', { count: 1 })).toBe(
      itUi.friendsGoing_one.replace('{{count}}', '1'),
    );
    expect(i18n.t('ui:friendsGoing', { count: 3 })).toBe(
      itUi.friendsGoing_other.replace('{{count}}', '3'),
    );
  });
});
