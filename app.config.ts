import type { ConfigContext, ExpoConfig } from 'expo/config';

import italianNative from './src/i18n/native/it.json';

const BACKGROUND = '#0B0B12';
const APP_ID = 'it.bitsharp.rightplace';

// Privacy (CLAUDE.md §3–4): foreground, coarse-by-design location only; no background, no microphone.
const BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.RECORD_AUDIO',
  'android.permission.WRITE_CONTACTS',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'RightPlace',
  slug: 'rightplace',
  owner: 'bitsharp-slu',
  version: '0.1.0',
  scheme: 'rightplace',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  backgroundColor: BACKGROUND,
  locales: {
    it: './src/i18n/native/it.json',
    en: './src/i18n/native/en.json',
  },
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: false,
    infoPlist: { CFBundleAllowMixedLocalizations: true },
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: BACKGROUND,
    },
    blockedPermissions: BLOCKED_ANDROID_PERMISSIONS,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } },
  },
  plugins: [
    'expo-router',
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-font',
    'expo-localization',
    'expo-image',
    'expo-notifications',
    [
      'expo-splash-screen',
      { backgroundColor: BACKGROUND, image: './assets/splash-icon.png', imageWidth: 160 },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: italianNative.NSLocationWhenInUseUsageDescription,
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        locationFullAccuracyPermission: false,
        motionUsagePermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: italianNative.NSCameraUsageDescription,
        photosPermission: italianNative.NSPhotoLibraryUsageDescription,
        microphonePermission: false,
      },
    ],
    ['expo-contacts', { contactsPermission: italianNative.NSContactsUsageDescription }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: '8eb7e0f8-8c1b-43fe-a730-924c140f2438' },
  },
});
