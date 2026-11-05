import { Linking } from 'react-native';

import type { TransportLink } from './transport';

// No canOpenURL: in Expo Go custom schemes cannot be declared, so we simply try and fall back.
async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false; // app not installed or scheme unsupported: not an error for the user
  }
}

export async function openTransportLink(link: TransportLink): Promise<boolean> {
  if (await tryOpen(link.primaryUrl)) return true;
  return link.fallbackUrl ? tryOpen(link.fallbackUrl) : false;
}
