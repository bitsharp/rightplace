import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Deterministic public config for tests (real values come from .env at runtime).
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

// Gestures and animations are native: react-native-gesture-handler's official jest setup renders plain views and
// the gesture callbacks are exercised through its jest utils. Worklets run on the JS thread (see the resolver in
// package.json); binding the gestures to the UI runtime has no meaning there and throws.
jest.mock('react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: jest.fn(),
}));
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () => ({
    installUIRuntimeBindings: jest.fn(),
  }),
);

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Search session tokens: the native module has no implementation in Jest.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID(),
}));

// Official Jest mock: the primitives render as plain View/ScrollView, so tests assert on props.
// Only KeyboardProvider is wrapped, in a View, so tests can find it (the official one is a bare string).
jest.mock('react-native-keyboard-controller', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('react-native-keyboard-controller/jest'),
    KeyboardProvider: (props: object) =>
      createElement(View, { testID: 'keyboard-provider', ...props }),
  };
});

// expo-clipboard is a native module: tests assert on what was copied.
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

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

beforeEach(() =>
  jest
    .requireActual<typeof import('@/features/posts/store/seenStories')>(
      '@/features/posts/store/seenStories',
    )
    .resetSeenStories(),
);

// react-native-maps is a native module: map and markers render as plain Views that show their
// children, so tests can find (and press) the markers the app places on the map.
jest.mock('react-native-maps', () => {
  const { createElement, useImperativeHandle } =
    jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  // A point (x, y) inside the map maps to a fixed, easy-to-assert coordinate: 45 + y / 1000, 9 + x / 1000.
  const animateToRegion = jest.fn();
  const MapView = ({ children, ref, ...props }: Record<string, unknown>) => {
    useImperativeHandle(ref as never, () => ({
      animateToRegion,
      coordinateForPoint: jest.fn(async (point: { x: number; y: number }) => ({
        latitude: 45 + point.y / 1000,
        longitude: 9 + point.x / 1000,
      })),
    }));
    return createElement(View, { testID: 'map-view', ...props }, children as never);
  };
  const Marker = ({ children, ...props }: Record<string, unknown>) =>
    createElement(View, { testID: 'map-marker', ...props }, children as never);
  return { __esModule: true, default: MapView, Marker, __animateToRegion: animateToRegion };
});

// expo-notifications is a native module: every call is a jest.fn() (calls are cleared before each test,
// implementations stay) so tests assert on what the app scheduled, requested and registered.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(
    async (request: { identifier?: string }) => request.identifier ?? 'id',
  ),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPermissionsAsync: jest.fn(async () => ({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  getExpoPushTokenAsync: jest.fn(async () => ({
    type: 'expo',
    data: 'ExponentPushToken[test-token]',
  })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
beforeEach(() => {
  const notifications = jest.requireMock<Record<string, unknown>>('expo-notifications');
  Object.values(notifications).forEach((member) => {
    if (jest.isMockFunction(member)) member.mockClear();
  });
});

// Suites in src/__tests__ mount the whole app (real router): the first render can exceed 5 s on slow machines.
if (/[\\/]src[\\/]__tests__[\\/]/.test(expect.getState().testPath ?? '')) jest.setTimeout(30_000);

beforeEach(() =>
  jest
    .requireActual<typeof import('@/features/notifications/store/notificationStore')>(
      '@/features/notifications/store/notificationStore',
    )
    .resetNotificationState(),
);

// react-native-view-shot is a native module: tests decide what the capture returns.
jest.mock('react-native-view-shot', () => ({
  captureScreen: jest.fn(async () => 'file:///capture.jpg'),
}));

// The feedback draft (and its temporary screenshot) must not leak between tests of the same file.
beforeEach(() =>
  jest
    .requireActual<typeof import('@/features/feedback/store/feedbackStore')>(
      '@/features/feedback/store/feedbackStore',
    )
    .resetFeedback(),
);

// Link actions (sheet and toast) live in a store shared by every text with links.
beforeEach(() =>
  jest
    .requireActual<typeof import('@/lib/links/linkActionsStore')>('@/lib/links/linkActionsStore')
    .resetLinkActions(),
);
