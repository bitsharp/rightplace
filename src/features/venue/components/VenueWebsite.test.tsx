import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { resetLinkActions, useLinkActions } from '@/lib/links/linkActionsStore';

import { VenueWebsite } from './VenueWebsite';

describe('VenueWebsite', () => {
  beforeEach(() => {
    resetLinkActions();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('senza sito non mostra nulla', async () => {
    await render(<VenueWebsite url={null} />);
    expect(screen.queryByText('venue:website.label')).toBeNull();
  });

  it('mostra "Sito web" con il dominio e l’icona', async () => {
    await render(<VenueWebsite url="https://www.locale.it/eventi" />);
    expect(screen.getByText('venue:website.label')).toBeOnTheScreen();
    expect(screen.getByText('www.locale.it')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-globe', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('il tocco apre il sito nel browser', async () => {
    await render(<VenueWebsite url="https://www.locale.it/eventi" />);
    await fireEvent.press(
      screen.getByRole('link', { name: 'venue:website.open({"domain":"www.locale.it"})' }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.locale.it/eventi');
  });

  it('il tocco lungo apre le azioni link (apri / copia)', async () => {
    await render(<VenueWebsite url="https://www.locale.it/eventi" />);
    await fireEvent(
      screen.getByRole('link', { name: 'venue:website.open({"domain":"www.locale.it"})' }),
      'longPress',
    );
    expect(useLinkActions.getState().sheetUrl).toBe('https://www.locale.it/eventi');
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });

  it('un indirizzo non http(s) non viene mostrato né aperto', async () => {
    await render(<VenueWebsite url="javascript:alert(1)" />);
    expect(screen.queryByText('venue:website.label')).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
