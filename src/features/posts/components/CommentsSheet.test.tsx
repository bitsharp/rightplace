import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { CommentsSheet } from './CommentsSheet';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const comment = (id: string, text: string, overrides: Record<string, unknown> = {}) => ({
  comment_id: id,
  user_id: 'u2',
  handle: 'gatto.blu',
  text,
  created_at: `2026-11-09T10:0${id}:00Z`,
  is_mine: false,
  can_delete: false,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

function open(onClose = jest.fn()) {
  const { Wrapper } = createQueryWrapper();
  return render(<CommentsSheet postId="p1" onClose={onClose} />, { wrapper: Wrapper });
}

describe('CommentsSheet: link', () => {
  afterEach(() => jest.restoreAllMocks());

  it('un link in un commento si apre con un tocco', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    setFakeRpc({ get_post_comments: [comment('1', 'guarda https://example.com/a')] });
    await open();
    await fireEvent.press(await screen.findByRole('link', { name: 'https://example.com/a' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/a');
  });

  it('il tocco lungo sul link di un commento apre le azioni del commento (un solo foglio)', async () => {
    setFakeRpc({ get_post_comments: [comment('1', 'guarda https://example.com/a')] });
    await open();
    await fireEvent(
      await screen.findByRole('link', { name: 'https://example.com/a' }),
      'longPress',
    );
    expect(await screen.findByText('feed:actions.reportComment')).toBeOnTheScreen();
  });
});

describe('CommentsSheet: foto profilo', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mostra la foto degli autori visibili (una richiesta) e l’iniziale per gli altri', async () => {
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ userId: 'u2', url: 'https://signed.test/a/u2' }] },
      error: null,
    });
    setFakeRpc({
      get_post_comments: [
        comment('1', 'ciao'),
        comment('2', 'anche io', { user_id: 'u3', handle: 'orso.verde' }),
      ],
    });
    await open();
    await screen.findByText('ciao');
    await waitFor(() =>
      expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(
        1,
      ),
    );
    expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledTimes(1);
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('avatar-urls', {
      body: { userIds: ['u2', 'u3'] },
    });
  });
});

describe('CommentsSheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('su Android con la tastiera aperta il foglio usa il padding della libreria e Invia si tocca al primo tap', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setFakeRpc({
      get_post_comments: [comment('1', 'primo')],
      add_post_comment: comment('2', 'ciao'),
    });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    await fireEvent(input, 'focus');
    expect(screen.getByTestId('sheet-keyboard-avoider').props.behavior).toBe('padding');
    await fireEvent.changeText(input, 'ciao');
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    await waitFor(() => expect(rpcCalls('add_post_comment')).toHaveLength(1));
  });

  it('la lista commenti non mangia il primo tap mentre la tastiera è aperta', async () => {
    setFakeRpc({ get_post_comments: [comment('1', 'primo')] });
    await open();
    await screen.findByText('primo');
    expect(screen.getByTestId('comments-list').props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('elenca i commenti dal più vecchio al più nuovo', async () => {
    setFakeRpc({ get_post_comments: [comment('2', 'secondo'), comment('1', 'primo')] });
    await open();
    expect(await screen.findByText('primo')).toBeOnTheScreen();
    const texts = screen.getAllByTestId('comment-text').map((node) => node.props.children);
    expect(texts).toEqual(['primo', 'secondo']);
  });

  it('senza commenti invita a scrivere il primo', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    expect(await screen.findByText('feed:comments.empty')).toBeOnTheScreen();
  });

  it('il campo accetta al massimo 300 caratteri e mostra il contatore', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    await fireEvent.changeText(input, 'x'.repeat(305));
    expect(screen.getByLabelText('feed:comments.placeholder').props.value).toBe('x'.repeat(300));
    await fireEvent.changeText(input, 'ciao');
    expect(screen.getByText('feed:comments.counter({"count":4,"max":300})')).toBeOnTheScreen();
  });

  it('Invia è disabilitato finché il testo è vuoto o di soli spazi', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    expect(screen.getByRole('button', { name: 'feed:comments.send' })).toBeDisabled();
    await fireEvent.changeText(input, '   ');
    expect(screen.getByRole('button', { name: 'feed:comments.send' })).toBeDisabled();
  });

  it('invia il commento senza spazi attorno e svuota il campo', async () => {
    setFakeRpc({
      get_post_comments: [],
      add_post_comment: [{ comment_id: 'c9', created_at: '2026-11-09T12:00:00Z' }],
    });
    await open();
    await fireEvent.changeText(
      await screen.findByLabelText('feed:comments.placeholder'),
      '  bella  ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    await waitFor(() => expect(rpcCalls('add_post_comment')).toHaveLength(1));
    expect(rpcCalls('add_post_comment')[0]?.[1]).toEqual({ p_post_id: 'p1', p_text: 'bella' });
    await waitFor(() =>
      expect(screen.getByLabelText('feed:comments.placeholder').props.value).toBe(''),
    );
  });

  it('un errore del server compare in chiaro e il testo resta', async () => {
    setFakeRpc({ get_post_comments: [] });
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) =>
      name === 'add_post_comment'
        ? { data: null, error: { message: 'POST_NOT_FOUND' } }
        : (base?.(name, args) ?? { data: null, error: null }),
    );
    await open();
    await fireEvent.changeText(await screen.findByLabelText('feed:comments.placeholder'), 'ciao');
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    expect(await screen.findByText('errors:rpc.POST_NOT_FOUND')).toBeOnTheScreen();
    expect(screen.getByLabelText('feed:comments.placeholder').props.value).toBe('ciao');
  });

  it('tocco lungo su un commento altrui: si può solo segnalare, e la segnalazione parte', async () => {
    setFakeRpc({ get_post_comments: [comment('1', 'primo')], report: null });
    await open();
    await fireEvent(await screen.findByText('primo'), 'longPress');
    expect(screen.queryByText('feed:actions.deleteComment')).toBeNull();
    await fireEvent.press(screen.getByText('feed:actions.reportComment'));
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toEqual({
      p_target_kind: 'comment',
      p_target_id: '1',
      p_reason: null,
    });
    expect(await screen.findByText('feed:actions.reported')).toBeOnTheScreen();
  });

  it('sul mio commento (o sul mio post) si può eliminare, senza segnalarlo', async () => {
    setFakeRpc({
      get_post_comments: [comment('1', 'mio', { is_mine: true, can_delete: true })],
      delete_post_comment: null,
    });
    await open();
    await fireEvent(await screen.findByText('mio'), 'longPress');
    expect(screen.queryByText('feed:actions.reportComment')).toBeNull();
    await fireEvent.press(screen.getByText('feed:actions.deleteComment'));
    await waitFor(() => expect(rpcCalls('delete_post_comment')).toHaveLength(1));
    expect(rpcCalls('delete_post_comment')[0]?.[1]).toEqual({ p_comment_id: '1' });
  });

  it('con postId nullo il foglio è chiuso', async () => {
    const { Wrapper } = createQueryWrapper();
    await render(<CommentsSheet postId={null} onClose={jest.fn()} />, { wrapper: Wrapper });
    expect(screen.queryByLabelText('feed:comments.placeholder')).toBeNull();
  });
});

describe('CommentsSheet: profilo dell’autore', () => {
  const LINK = 'ui:profileLink.open({"handle":"@gatto.blu"})';
  beforeEach(() => mockPush.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('su iOS chiude il foglio e apre il profilo solo a foglio sparito', async () => {
    const onClose = jest.fn();
    setFakeRpc({ get_post_comments: [comment('1', 'ciao')] });
    await open(onClose);
    await fireEvent.press((await screen.findAllByRole('link', { name: LINK }))[0] as never);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => screen.getByTestId('sheet-modal').props.onDismiss());
    expect(mockPush).toHaveBeenCalledWith('/u/gatto.blu');
  });

  it('su Android apre il profilo subito', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setFakeRpc({ get_post_comments: [comment('1', 'ciao')] });
    await open();
    await fireEvent.press((await screen.findAllByRole('link', { name: LINK }))[0] as never);
    expect(mockPush).toHaveBeenCalledWith('/u/gatto.blu');
  });

  it('il mio commento porta alla tab Profilo', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setFakeRpc({
      get_post_comments: [comment('1', 'ciao', { is_mine: true, handle: 'lince.rosso' })],
    });
    await open();
    const links = await screen.findAllByRole('link', {
      name: 'ui:profileLink.open({"handle":"@lince.rosso"})',
    });
    await fireEvent.press(links[1] as never);
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });
});

const EMOJI = (key: string) => `ui:quickEmoji.insert({"name":"ui:quickEmoji.names.${key}"})`;

describe('CommentsSheet: emoji', () => {
  const field = () => screen.getByLabelText('feed:comments.placeholder');

  it('un tocco sull’emoji la inserisce in coda quando non c’è selezione', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    await fireEvent.changeText(await screen.findByLabelText('feed:comments.placeholder'), 'ciao');
    await fireEvent.press(screen.getByLabelText(EMOJI('fire')));
    expect(field().props.value).toBe('ciao🔥');
  });

  it('inserisce nella posizione del cursore', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    await fireEvent.changeText(input, 'ciao mondo');
    await fireEvent(input, 'selectionChange', {
      nativeEvent: { selection: { start: 4, end: 4 } },
    });
    await fireEvent.press(screen.getByLabelText(EMOJI('heartEyes')));
    expect(field().props.value).toBe('ciao😍 mondo');
  });

  it('il contatore conta i code point, non le unità UTF-16', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    await fireEvent.changeText(await screen.findByLabelText('feed:comments.placeholder'), '👨‍👩‍👧😂');
    expect(screen.getByText('feed:comments.counter({"count":6,"max":300})')).toBeOnTheScreen();
  });

  it('300 emoji sono un commento valido e Invia resta attivo', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    await fireEvent.changeText(
      await screen.findByLabelText('feed:comments.placeholder'),
      '🔥'.repeat(300),
    );
    expect(field().props.value).toBe('🔥'.repeat(300));
    expect(screen.getByRole('button', { name: 'feed:comments.send' })).toBeEnabled();
  });

  it('non permette di superare 300 code point inserendo un’emoji', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    await fireEvent.changeText(
      await screen.findByLabelText('feed:comments.placeholder'),
      'x'.repeat(299),
    );
    await fireEvent.press(screen.getByLabelText(EMOJI('fire')));
    await fireEvent.press(screen.getByLabelText(EMOJI('laugh')));
    expect(field().props.value).toBe(`${'x'.repeat(299)}🔥`);
  });

  it('invia alla RPC il testo con le emoji intatto', async () => {
    setFakeRpc({
      get_post_comments: [],
      add_post_comment: [{ comment_id: 'c9', created_at: '2026-11-09T12:00:00Z' }],
    });
    await open();
    await fireEvent.changeText(await screen.findByLabelText('feed:comments.placeholder'), 'bella');
    await fireEvent.press(screen.getByLabelText(EMOJI('heart')));
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    await waitFor(() => expect(rpcCalls('add_post_comment')).toHaveLength(1));
    expect(rpcCalls('add_post_comment')[0]?.[1]).toEqual({ p_post_id: 'p1', p_text: 'bella❤️' });
  });

  it('nei commenti pubblicati le emoji restano intere, anche accanto a un link', async () => {
    setFakeRpc({
      get_post_comments: [comment('1', '👨‍👩‍👧 🇮🇹 ❤️ www.example.com🔥 😂')],
    });
    await open();
    const link = await screen.findByRole('link', { name: 'www.example.com' });
    expect(link.props.children).toBe('www.example.com');
    expect(screen.getByTestId('comment-text')).toHaveTextContent('👨‍👩‍👧 🇮🇹 ❤️ www.example.com🔥 😂');
  });
});
