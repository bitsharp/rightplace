import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Components are tested by translation key (CLAUDE.md): `t('title')` in namespace `map` renders "map:title".
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: (namespace = 'common') => ({
    t: (key: string) => (key.includes(':') ? key : `${namespace}:${key}`),
  }),
}));
