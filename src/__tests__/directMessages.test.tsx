import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase } from '@/test/fakeSupabase';
import { seedChatBackend } from '@/test/chatBackend';
import { seedFeedBackend } from '@/test/feedBackend';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const VOLPE = { id: 'u-volpe', handle: 'volpe.viola', age_band: '25-34', gender: 'female' };
const THREAD = {
  thread_id: 't1',
  other_user_id: 'u-volpe',
  other_handle: 'volpe.viola',
  last_text: 'ci vediamo alle 11',
  last_message_at: '2026-11-24T20:00:00Z',
  last_sender_is_me: false,
  unread: true,
};

// Adds the direct-message RPCs on top of whatever backend a test seeded.
function withDmRpcs(answers: Record<string, unknown>) {
  const base = fakeSupabase.rpc.getMockImplementation();
  fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) =>
    name in answers
      ? { data: answers[name], error: null }
      : (base?.(name, args) ?? { data: null, error: null }),
  );
}

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('Messaggi diretti nel tab Chat', () => {
  beforeEach(() => {
    seedChatBackend({ rooms: [], users: [VOLPE], accepted: ['u-volpe'] });
  });

  it('il segmento Messaggi mostra la casella e un tocco apre la conversazione', async () => {
    withDmRpcs({
      get_dm_threads: [THREAD],
      get_dm_unread_count: 1,
      get_dm_messages: [],
      mark_dm_read: null,
    });
    await renderApp('ready', '/chat');
    await fireEvent.press(await screen.findByRole('button', { name: 'dm:tabs.messages' }));
    await fireEvent.press(await screen.findByText('@volpe.viola'));
    expect(await screen.findByRole('header', { name: '@volpe.viola' })).toBeOnTheScreen();
    expect(screen.getByText('dm:thread.banner')).toBeOnTheScreen();
  });

  it('il badge del tab Chat conta le conversazioni non lette', async () => {
    withDmRpcs({ get_dm_threads: [THREAD], get_dm_unread_count: 2 });
    await renderApp('ready', '/chat');
    expect(await screen.findByTestId('tab-badge-chat')).toHaveTextContent('2');
  });

  it('prima della migration sul server la schermata Chat funziona come sempre, senza badge', async () => {
    await renderApp('ready', '/chat');
    expect(await screen.findByText('chat:list.empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-badge-chat')).toBeNull();
  });
});

describe('bottone Messaggio sul profilo pubblico', () => {
  const profile = (accepted: string[], followers: string[] = []) => {
    seedFeedBackend({
      users: [VOLPE],
      accepted,
      followers,
      summaries: { 'u-volpe': { follow_state: accepted.length ? 'accepted' : 'none' } },
    });
  };

  it('compare se seguo l’amico (follow accettato) e apre la conversazione', async () => {
    profile(['u-volpe']);
    withDmRpcs({ open_dm_thread: 't1', get_dm_messages: [], mark_dm_read: null });
    await renderApp('ready', '/u/volpe.viola');
    await fireEvent.press(await screen.findByRole('button', { name: 'dm:profile.message' }));
    await waitFor(() => expect(rpcCalls('open_dm_thread')).toHaveLength(1));
    expect(rpcCalls('open_dm_thread')[0]?.[1]).toEqual({ p_handle: 'volpe.viola' });
    expect(await screen.findByText('dm:thread.banner')).toBeOnTheScreen();
  });

  it('compare anche se è lui a seguire me (legame nell’altra direzione)', async () => {
    profile([], ['u-volpe']);
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByRole('button', { name: 'dm:profile.message' })).toBeOnTheScreen();
  });

  it('per uno sconosciuto non c’è', async () => {
    profile([]);
    await renderApp('ready', '/u/volpe.viola');
    await screen.findByText('@volpe.viola');
    expect(screen.queryByRole('button', { name: 'dm:profile.message' })).toBeNull();
  });

  it('se il server risponde NOT_LINKED lo dice e non apre nulla', async () => {
    profile(['u-volpe']);
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) =>
      name === 'open_dm_thread'
        ? { data: null, error: { message: 'NOT_LINKED' } }
        : (base?.(name, args) ?? { data: null, error: null }),
    );
    await renderApp('ready', '/u/volpe.viola');
    await fireEvent.press(await screen.findByRole('button', { name: 'dm:profile.message' }));
    expect(await screen.findByText('errors:rpc.NOT_LINKED')).toBeOnTheScreen();
    expect(screen.queryByText('dm:thread.banner')).toBeNull();
  });
});
