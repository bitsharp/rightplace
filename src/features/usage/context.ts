import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type UsagePlatform = 'ios' | 'android' | 'web';

// The only things recorded about the device: ios / android and the app version (principle 1: nothing else).
export function usageContext(): { platform: UsagePlatform; appVersion: string | null } {
  const platform: UsagePlatform =
    Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  return { platform, appVersion: Constants.expoConfig?.version ?? null };
}
