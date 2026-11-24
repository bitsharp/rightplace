import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { useAuthStore } from '@/features/auth/store/authStore';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { DmThreadScreen } from './DmThreadScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));

const THEIRS = {
  id: 'm1',
  sender_is_me: false,
  sender_id: 'u-volpe',
  text: 'ci vediamo alle 11 https://example.com',
  created_at: '2026-11-24T20:00:00Z',
};
const MINE = {
  id: 'm2',
  sender_is_me: true,
  sender_id: 'me',
  text: 'ok ci sono',
  created_at: '2026-11-24T20:05:00Z',
};

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

async function open(rpc: Record<string, unknown> = {}) {
  useAuthStore.setState({
    initialized: true,
    session: { userId: 'me', email: 'x@y.z', emailConfirmed: true },
  });
  setFakeRpc({
    get_dm_messages: [MINE, THEIRS],
    mark_dm_read: null,
    send_dm: [{ id: 'm3', created_at: '2026-11-24T20:10:00Z' }],
    report: null,
    ...rpc,
  });
  const { Wrapper } = createQueryWrapper();
  await render(<DmThreadScreen threadId="t1" handle="volpe.viola" userId="u-volpe" />, {
    wrapper: Wrapper,
  });
}

describe('DmThreadScreen', () => {
  it('mostra @handle, il banner dei 7 giorni e i messaggi', async () => {
    await open();
    expect(await screen.findByText('ok ci sono')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '@volpe.viola' })).toBeOnTheScreen();
    expect(screen.getByText('dm:thread.banner')).toBeOnTheScreen();
  });

  it('il tocco sull’intestazione apre il profilo dell’amico', async () => {
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'dm:thread.openProfile' }));
    expect(mockPush).toHaveBeenCalledWith('/u/volpe.viola');
  });

  it('segna come letto all’apertura', async () => {
    await open();
    await waitFor(() => expect(rpcCalls('mark_dm_read').length).toBeGreaterThan(0));
    expect(rpcCalls('mark_dm_read')[0]?.[1]).toEqual({ p_thread: 't1' });
  });

  it('invia il testo senza spazi esterni e svuota il campo', async () => {
    await open();
    const input = await screen.findByLabelText('dm:thread.placeholder');
    await fireEvent.changeText(input, '  a dopo  ');
    await fireEvent.press(screen.getByRole('button', { name: 'dm:thread.send' }));
    await waitFor(() => expect(rpcCalls('send_dm')).toHaveLength(1));
    expect(rpcCalls('send_dm')[0]?.[1]).toEqual({ p_thread: 't1', p_text: 'a dopo' });
    await waitFor(() => expect(input.props.value).toBe(''));
    expect(await screen.findByText('a dopo')).toBeOnTheScreen();
  });

  it('con il campo vuoto (o solo spazi) l’invio è disattivato e non chiama il server', async () => {
    await open();
    const input = await screen.findByLabelText('dm:thread.placeholder');
    const send = screen.getByRole('button', { name: 'dm:thread.send' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(input, '   ');
    await fireEvent.press(send);
    expect(rpcCalls('send_dm')).toHaveLength(0);
  });

  it('la barra emoji inserisce l’emoji nel testo', async () => {
    await open();
    const input = await screen.findByLabelText('dm:thread.placeholder');
    const [first] = screen.getAllByRole('button', { name: /ui:quickEmoji\.insert/ });
    if (!first) throw new Error('barra emoji assente');
    await fireEvent.press(first);
    expect(String(input.props.value)).toContain('❤️');
  });

  it('copia il testo di un messaggio con la pressione lunga', async () => {
    await open();
    await fireEvent(await screen.findByText('ok ci sono'), 'longPress');
    await fireEvent.press(await screen.findByText('dm:actions.copyText'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ok ci sono');
  });

  it('segnala e blocca solo i messaggi altrui', async () => {
    await open();
    await fireEvent(await screen.findByText('ok ci sono'), 'longPress');
    expect(await screen.findByText('dm:actions.copyText')).toBeOnTheScreen();
    expect(screen.queryByText('dm:actions.report')).toBeNull();
    expect(screen.queryByText('dm:actions.block')).toBeNull();
    await fireEvent.press(screen.getByText('dm:actions.cancel'));

    await fireEvent(screen.getByText(/ci vediamo alle 11/), 'longPress');
    await fireEvent.press(await screen.findByText('dm:actions.report'));
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toEqual({
      p_target_kind: 'dm',
      p_target_id: 'm1',
      p_reason: null,
    });
  });

  it('se il legame è caduto (NOT_LINKED) il campo si disattiva e lo spiega', async () => {
    await open();
    fakeSupabase.rpc.mockImplementation(async (name: string) =>
      name === 'send_dm'
        ? { data: null, error: { message: 'NOT_LINKED' } }
        : { data: name === 'get_dm_messages' ? [] : null, error: null },
    );
    const input = await screen.findByLabelText('dm:thread.placeholder');
    await fireEvent.changeText(input, 'ciao');
    await fireEvent.press(screen.getByRole('button', { name: 'dm:thread.send' }));
    expect(await screen.findByText('dm:thread.closed')).toBeOnTheScreen();
    expect(screen.queryByLabelText('dm:thread.placeholder')).toBeNull();
  });

  it('se all’apertura il segna-come-letto risponde NOT_LINKED, la conversazione è già chiusa', async () => {
    await open();
    await screen.unmount();
    fakeSupabase.rpc.mockImplementation(async (name: string) =>
      name === 'mark_dm_read'
        ? { data: null, error: { message: 'NOT_LINKED' } }
        : { data: name === 'get_dm_messages' ? [] : null, error: null },
    );
    const { Wrapper } = createQueryWrapper();
    await render(<DmThreadScreen threadId="t1" handle="volpe.viola" userId="u-volpe" />, {
      wrapper: Wrapper,
    });
    expect(await screen.findByText('dm:thread.closed')).toBeOnTheScreen();
  });
});
