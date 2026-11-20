import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { seedChatBackend, type FakeMessage } from '@/test/chatBackend';
import { fakeSupabase } from '@/test/fakeSupabase';

const VOLPE = { id: 'u-volpe', handle: 'volpe.viola' };
const ARENA = { room_id: 'r1', venue_id: 'arena', venue_name: 'Arena Club' };

const photo = (id: string, minute: number): FakeMessage => ({
  id,
  user_id: VOLPE.id,
  handle: VOLPE.handle,
  kind: 'photo',
  text: null,
  created_at: `2026-11-07T22:0${minute}:00Z`,
});

async function openChatWithPhotos() {
  seedChatBackend({
    rooms: [ARENA],
    messages: [photo('p1', 1), photo('p2', 2), photo('p3', 3)],
    users: [VOLPE],
    accepted: [VOLPE.id],
  });
  fakeSupabase.functions.invoke.mockResolvedValue({
    data: {
      urls: ['p1', 'p2', 'p3'].map((id) => ({ messageId: id, url: `https://signed.test/${id}` })),
    },
    error: null,
  });
  await renderApp('ready', '/night/r1/chat');
  await screen.findByText('chat:photos({"count":3})');
}

describe('foto della serata ingrandibili', () => {
  it('tocco su una miniatura: il viewer si apre su quella foto, tra tutte le foto della serata', async () => {
    await openChatWithPhotos();
    // newest first, like the strip: p3, p2, p1
    const thumbs = screen.getAllByLabelText(/chat:photoThumb/);
    await fireEvent.press(thumbs[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":2,"total":3})'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('photo-viewer-list').props.initialScrollIndex).toBe(1);
  });

  it('tocco su una foto dentro un messaggio: il viewer si apre sulla stessa foto della striscia', async () => {
    await openChatWithPhotos();
    const inMessages = screen.getAllByLabelText('ui:photoViewer.open');
    expect(inMessages).toHaveLength(3);
    await fireEvent.press(inMessages[2] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":3,"total":3})'),
    ).toBeOnTheScreen();
  });

  it("la X chiude il viewer e la chat resta com'era", async () => {
    await openChatWithPhotos();
    await fireEvent.press(screen.getAllByLabelText(/chat:photoThumb/)[0] as never);
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:photoViewer.close' }));
    await waitFor(() => expect(screen.queryByText(/ui:photoViewer.counter/)).toBeNull());
    expect(screen.getByText('chat:photos({"count":3})')).toBeOnTheScreen();
  });
});
