import { fireEvent, render, screen } from '@testing-library/react-native';

import { setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { DmInbox } from './DmInbox';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: mockPush }),
}));

const thread = (overrides: Record<string, unknown> = {}) => ({
  thread_id: 't1',
  other_user_id: 'u-volpe',
  other_handle: 'volpe.viola',
  last_text: 'ci vediamo alle 11',
  last_message_at: '2026-11-24T20:00:00Z',
  last_sender_is_me: false,
  unread: false,
  ...overrides,
});

async function open(rows: unknown[]) {
  setFakeRpc({ get_dm_threads: rows });
  const { Wrapper } = createQueryWrapper();
  await render(<DmInbox />, { wrapper: Wrapper });
}

describe('DmInbox', () => {
  it('mostra handle, anteprima e il pallino solo per le conversazioni non lette', async () => {
    await open([
      thread({ unread: true }),
      thread({ thread_id: 't2', other_handle: 'gatto.blu', last_text: 'ok', unread: false }),
    ]);
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('ci vediamo alle 11')).toBeOnTheScreen();
    expect(screen.getAllByTestId('dm-unread-dot')).toHaveLength(1);
  });

  it('nelle mie risposte l’anteprima è preceduta da "Tu"', async () => {
    await open([thread({ last_sender_is_me: true })]);
    expect(
      await screen.findByText('dm:inbox.you({"text":"ci vediamo alle 11"})'),
    ).toBeOnTheScreen();
  });

  it('senza conversazioni spiega che si scrive dal profilo di un amico', async () => {
    await open([]);
    expect(await screen.findByText('dm:inbox.empty')).toBeOnTheScreen();
  });

  it('un tocco apre il thread', async () => {
    await open([thread()]);
    await fireEvent.press(await screen.findByText('@volpe.viola'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dm/[threadId]',
      params: { threadId: 't1', handle: 'volpe.viola', userId: 'u-volpe' },
    });
  });

  it('se il server non risponde mostra l’errore', async () => {
    setFakeRpc({ get_dm_threads: 'non valido' });
    const { Wrapper } = createQueryWrapper();
    await render(<DmInbox />, { wrapper: Wrapper });
    expect(await screen.findByText('dm:inbox.loadError')).toBeOnTheScreen();
  });
});
