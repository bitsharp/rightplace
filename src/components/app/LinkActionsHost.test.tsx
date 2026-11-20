import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { useLinkActions } from '@/lib/links/linkActionsStore';

import { LinkActionsHost } from './LinkActionsHost';

describe('LinkActionsHost', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('non mostra nulla finché nessun link è selezionato', async () => {
    await render(<LinkActionsHost />);
    expect(screen.queryByText('ui:links.open')).toBeNull();
  });

  it('mostra Apri link e Copia link per il link scelto', async () => {
    await render(<LinkActionsHost />);
    await act(async () => useLinkActions.getState().openSheet('https://example.com'));
    expect(screen.getByText('https://example.com')).toBeOnTheScreen();
    expect(screen.getByText('ui:links.open')).toBeOnTheScreen();
    expect(screen.getByText('ui:links.copy')).toBeOnTheScreen();
  });

  it('Copia link copia l\'indirizzo, chiude il foglio e mostra "Copiato"', async () => {
    await render(<LinkActionsHost />);
    await act(async () => useLinkActions.getState().openSheet('https://example.com'));
    await fireEvent.press(screen.getByText('ui:links.copy'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://example.com');
    expect(useLinkActions.getState().sheetUrl).toBeNull();
    expect(await screen.findByText('ui:links.copied')).toBeOnTheScreen();
  });

  it('Apri link aspetta che il foglio sia sparito (iOS) e poi apre il browser', async () => {
    await render(<LinkActionsHost />);
    await act(async () => useLinkActions.getState().openSheet('https://example.com'));
    const modal = screen.getByTestId('sheet-modal');
    await fireEvent.press(screen.getByText('ui:links.open'));
    expect(useLinkActions.getState().sheetUrl).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
    await act(async () => modal.props.onDismiss());
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('il toast di errore sparisce da solo', async () => {
    jest.useFakeTimers();
    await render(<LinkActionsHost />);
    await act(async () => useLinkActions.getState().setNotice('openFailed'));
    expect(screen.getByText('ui:links.openFailed')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(4000));
    expect(screen.queryByText('ui:links.openFailed')).toBeNull();
    jest.useRealTimers();
  });
});
