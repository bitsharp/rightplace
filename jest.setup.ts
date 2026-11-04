import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Deterministic public config for tests (real values come from .env at runtime).
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

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
    useTranslation: (namespace = 'common') => ({
      t: translate(namespace),
      i18n: { language: 'it' },
    }),
  };
});

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

// The Supabase client is the external boundary: every test gets a fresh in-memory fake.
jest.mock('@/lib/supabase', () => ({
  supabase: jest.requireActual('@/test/fakeSupabase').fakeSupabase,
}));
beforeEach(() =>
  jest
    .requireActual<typeof import('@/test/fakeSupabase')>('@/test/fakeSupabase')
    .resetFakeSupabase(),
);

// WebView is a native module: render it as a plain View so tests can post Turnstile messages to it.
jest.mock('react-native-webview', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    WebView: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'turnstile-webview', ...props }),
  };
});

// Persisted UI preferences (view, city) would leak between tests of the same file.
beforeEach(() =>
  jest
    .requireActual<typeof import('@/features/map/store/mapStore')>('@/features/map/store/mapStore')
    .resetMapStore(),
);

// react-native-maps is a native module: map and markers render as plain Views that show their
// children, so tests can find (and press) the markers the app places on the map.
jest.mock('react-native-maps', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = ({ children, ...props }: Record<string, unknown>) =>
    createElement(View, { testID: 'map-view', ...props }, children as never);
  const Marker = ({ children, ...props }: Record<string, unknown>) =>
    createElement(View, { testID: 'map-marker', ...props }, children as never);
  return { __esModule: true, default: MapView, Marker };
});
