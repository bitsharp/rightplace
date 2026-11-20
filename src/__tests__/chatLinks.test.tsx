import { fireEvent, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { renderApp } from '@/test/appFlows';
import { seedChatBackend } from '@/test/chatBackend';

const VOLPE = { id: 'u-volpe', handle: 'volpe.viola' };
const ARENA = { room_id: 'r1', venue_id: 'arena', venue_name: 'Arena Club' };

const message = (text: string) => ({
  id: 'm1',
  user_id: VOLPE.id,
  handle: VOLPE.handle,
  text,
  created_at: '2026-11-07T22:01:00Z',
});

describe('link nella chat di serata', () => {
  afterEach(() => jest.restoreAllMocks());

  const openWith = async (text: string) => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [message(text)],
      users: [VOLPE],
      accepted: ['u-volpe'],
    });
    await renderApp('ready', '/night/r1/chat');
  };

  it("un tocco su un link www. apre il browser con l'indirizzo https", async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openWith('biglietti su www.example.com/b.');
    await fireEvent.press(await screen.findByRole('link'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.example.com/b');
  });

  it('un tocco lungo sul link offre Apri link e Copia link', async () => {
    await openWith('guarda https://example.com/x');
    await fireEvent(await screen.findByRole('link'), 'longPress');
    expect(await screen.findByText('ui:links.open')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('ui:links.copy'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://example.com/x');
    expect(await screen.findByText('ui:links.copied')).toBeOnTheScreen();
  });

  it('un javascript: nel messaggio resta testo e non è un link', async () => {
    await openWith('javascript:alert(1)');
    expect(await screen.findByText('javascript:alert(1)')).toBeOnTheScreen();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
