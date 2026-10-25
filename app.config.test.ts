import type { ConfigContext, ExpoConfig } from 'expo/config';

import buildConfig from './app.config';

const ALLOWED_IOS_PERMISSIONS = [
  'NSCameraUsageDescription',
  'NSContactsUsageDescription',
  'NSLocationWhenInUseUsageDescription',
  'NSPhotoLibraryUsageDescription',
];

type PluginEntry = NonNullable<ExpoConfig['plugins']>[number];

const config = buildConfig({ config: {} } as ConfigContext);

function pluginOptions(name: string): Record<string, unknown> {
  const entry = config.plugins?.find((plugin: PluginEntry) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name,
  );
  if (!Array.isArray(entry)) throw new Error(`Plugin ${name} senza opzioni`);
  return entry[1] as Record<string, unknown>;
}

describe('app.config', () => {
  it('punta al progetto EAS esistente di bitsharp-slu', () => {
    expect(config).toMatchObject({
      name: 'RightPlace',
      slug: 'rightplace',
      owner: 'bitsharp-slu',
      scheme: 'rightplace',
      userInterfaceStyle: 'dark',
      extra: { eas: { projectId: '8eb7e0f8-8c1b-43fe-a730-924c140f2438' } },
      ios: { bundleIdentifier: 'it.bitsharp.rightplace' },
      android: { package: 'it.bitsharp.rightplace' },
    });
  });

  it('dichiara solo i permessi iOS che il prodotto usa, con il perché in italiano', () => {
    const locationText = pluginOptions('expo-location').locationWhenInUsePermission;
    const pickerOptions = pluginOptions('expo-image-picker');
    const contactsText = pluginOptions('expo-contacts').contactsPermission;
    expect(locationText).toMatch(/solo mentre usi l'app/);
    expect(pickerOptions.cameraPermission).toEqual(expect.any(String));
    expect(pickerOptions.photosPermission).toEqual(expect.any(String));
    expect(contactsText).toEqual(expect.any(String));
  });

  it('disattiva posizione in background, posizione precisa temporanea, movimento, microfono e Face ID', () => {
    expect(pluginOptions('expo-location')).toMatchObject({
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
      locationAlwaysAndWhenInUsePermission: false,
      locationAlwaysPermission: false,
      locationFullAccuracyPermission: false,
      motionUsagePermission: false,
    });
    expect(pluginOptions('expo-image-picker').microphonePermission).toBe(false);
    expect(pluginOptions('expo-secure-store').faceIDPermission).toBe(false);
    expect(config.ios?.infoPlist?.UIBackgroundModes).toBeUndefined();
  });

  it('blocca su Android i permessi aggiunti dalle librerie che il prodotto non usa', () => {
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.WRITE_CONTACTS',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ]),
    );
  });

  it('localizza i testi dei permessi iOS in italiano e inglese', () => {
    expect(Object.keys(config.locales ?? {})).toEqual(['it', 'en']);
    const italian = require('./src/i18n/native/it.json');
    const english = require('./src/i18n/native/en.json');
    expect(Object.keys(italian)).toEqual(expect.arrayContaining(ALLOWED_IOS_PERMISSIONS));
    expect(Object.keys(english)).toEqual(expect.arrayContaining(ALLOWED_IOS_PERMISSIONS));
  });

  it('legge la chiave Google Maps Android dalle variabili d’ambiente', () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = 'maps-key';
    const withKey = buildConfig({ config: {} } as ConfigContext);
    expect(withKey.android?.config?.googleMaps?.apiKey).toBe('maps-key');
  });
});
