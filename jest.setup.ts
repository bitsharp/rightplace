import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

// Components are tested by translation key (CLAUDE.md): `t('title')` in namespace `map` renders "map:title";
// interpolation values are appended as JSON, e.g. "ui:gender.a11y({"female":52,"male":48})".
jest.mock('react-i18next', () => {
  const translate = (namespace: string) => (key: string, options?: Record<string, unknown>) => {
    const qualified = key.includes(':') ? key : `${namespace}:${key}`;
    return options ? `${qualified}(${JSON.stringify(options)})` : qualified;
  };
  return {
    initReactI18next: { type: '3rdParty', init: () => undefined },
    useTranslation: (namespace = 'common') => ({ t: translate(namespace) }),
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
