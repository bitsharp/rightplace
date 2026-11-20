import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { isOpenableUrl } from '@/features/chat/domain/linkify';

import { useLinkActions } from './linkActionsStore';

function notify(notice: 'copied' | 'openFailed'): void {
  useLinkActions.getState().setNotice(notice);
}

// Opens in the system browser. Never throws: a missing browser or a refused scheme becomes a toast.
export async function openLink(url: string): Promise<boolean> {
  if (!isOpenableUrl(url)) {
    notify('openFailed');
    return false;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    notify('openFailed');
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(text);
  } catch {
    // The clipboard is a nicety: no "Copiato" when it did not work.
    return;
  }
  notify('copied');
}
