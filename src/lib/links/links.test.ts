import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { useLinkActions } from './linkActionsStore';
import { copyToClipboard, openLink } from './links';

describe('openLink', () => {
  it('apre un link https nel browser di sistema', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(openLink('https://example.com')).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith('https://example.com');
  });

  it.each(['javascript:alert(1)', 'tel:+39021234', 'intent://x', 'www.example.com'])(
    'non apre mai %s e avvisa',
    async (url) => {
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      await expect(openLink(url)).resolves.toBe(false);
      expect(open).not.toHaveBeenCalled();
      expect(useLinkActions.getState().notice).toBe('openFailed');
    },
  );

  it('se il sistema rifiuta il link, non lancia e avvisa', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    await expect(openLink('https://example.com')).resolves.toBe(false);
    expect(useLinkActions.getState().notice).toBe('openFailed');
  });
});

describe('copyToClipboard', () => {
  it('copia il testo e mostra "Copiato"', async () => {
    await copyToClipboard('https://example.com');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://example.com');
    expect(useLinkActions.getState().notice).toBe('copied');
  });

  it('se la copia fallisce non lancia e non dice "Copiato"', async () => {
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('denied'));
    await copyToClipboard('ciao');
    expect(useLinkActions.getState().notice).toBeNull();
  });
});
