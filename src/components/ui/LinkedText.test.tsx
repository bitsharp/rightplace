import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import { useLinkActions } from '@/lib/links/linkActionsStore';
import { colors } from '@/theme/tokens';

import { LinkedText } from './LinkedText';

describe('LinkedText', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it("mostra il testo senza link com'è", async () => {
    await render(<LinkedText text="ciao @lince.rosso" />);
    expect(screen.getByText('ciao @lince.rosso')).toBeOnTheScreen();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('sottolinea i link nel colore del token', async () => {
    await render(<LinkedText text="vedi www.example.com ora" />);
    const link = screen.getByRole('link');
    expect(StyleSheet.flatten(link.props.style)).toMatchObject({
      color: colors.maybe,
      textDecorationLine: 'underline',
    });
  });

  it('usa il colore di link richiesto (es. sul mio messaggio)', async () => {
    await render(<LinkedText text="www.example.com" linkColor="onAccent" />);
    expect(StyleSheet.flatten(screen.getByRole('link').props.style).color).toBe(colors.onAccent);
  });

  it("al tocco apre l'indirizzo normalizzato nel browser", async () => {
    await render(<LinkedText text="vedi www.example.com/x." />);
    await fireEvent.press(screen.getByRole('link'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.example.com/x');
  });

  it('se il browser non si apre avvisa', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('x'));
    await render(<LinkedText text="https://example.com" />);
    await fireEvent.press(screen.getByRole('link'));
    await screen.findByRole('link');
    expect(useLinkActions.getState().notice).toBe('openFailed');
  });

  it('al tocco lungo apre il foglio azioni del link', async () => {
    await render(<LinkedText text="https://example.com/a" />);
    await fireEvent(screen.getByRole('link'), 'longPress');
    expect(useLinkActions.getState().sheetUrl).toBe('https://example.com/a');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('se il chiamante gestisce il tocco lungo, il foglio dei link non si apre', async () => {
    const onLinkLongPress = jest.fn();
    await render(<LinkedText text="https://example.com/a" onLinkLongPress={onLinkLongPress} />);
    await fireEvent(screen.getByRole('link'), 'longPress');
    expect(onLinkLongPress).toHaveBeenCalledWith('https://example.com/a');
    expect(useLinkActions.getState().sheetUrl).toBeNull();
  });

  it('javascript: resta testo semplice e non è toccabile', async () => {
    await render(<LinkedText text="javascript:alert(1)" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('javascript:alert(1)')).toBeOnTheScreen();
  });
});
