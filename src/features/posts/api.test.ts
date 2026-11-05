import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchFeedPage,
  fetchPostPhotoUrls,
  fetchPostTarget,
  fetchStoryPosts,
  reportComment,
  reportPost,
  setPostLike,
} from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const postRow = (overrides: Record<string, unknown> = {}) => ({
  post_id: 'p1',
  author_id: 'u1',
  author_handle: 'volpe.viola',
  venue_name: 'Arena Club',
  night_date: '2026-11-08',
  caption: 'Che serata',
  has_photo: true,
  visible_from: '2026-11-09T05:00:00.123456+00:00',
  expires_at: '2026-11-16T05:00:00.123456+00:00',
  like_count: 4,
  comment_count: 2,
  liked_by_me: false,
  is_mine: false,
  ...overrides,
});

const feedPost = {
  id: 'p1',
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: 'Che serata',
  hasPhoto: true,
  visibleFrom: '2026-11-09T05:00:00.123456+00:00',
  expiresAt: '2026-11-16T05:00:00.123456+00:00',
  likeCount: 4,
  commentCount: 2,
  likedByMe: false,
  isMine: false,
};

describe('fetchPostTarget', () => {
  it('senza righe non si può postare', async () => {
    respondWith([]);
    await expect(fetchPostTarget()).resolves.toBeNull();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_post_target', undefined);
  });

  it('con una riga restituisce il bersaglio', async () => {
    respondWith([
      {
        night_id: 'n1',
        event_id: null,
        venue_name: 'Arena Club',
        night_date: '2026-11-08',
        room_id: 'r1',
      },
    ]);
    await expect(fetchPostTarget()).resolves.toEqual({
      nightId: 'n1',
      eventId: null,
      venueName: 'Arena Club',
      nightDate: '2026-11-08',
      roomId: 'r1',
    });
  });
});

describe('createPost', () => {
  it('passa testo e path dei due file', async () => {
    respondWith([
      { post_id: 'p9', visible_from: '2026-11-09T05:00:00Z', expires_at: '2026-11-16T05:00:00Z' },
    ]);
    await expect(
      createPost({ caption: 'ciao', photoPath: 'u/a.jpg', chatPhotoPath: 'u/b.jpg' }),
    ).resolves.toEqual({
      postId: 'p9',
      visibleFrom: '2026-11-09T05:00:00Z',
      expiresAt: '2026-11-16T05:00:00Z',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('create_post', {
      p_caption: 'ciao',
      p_photo_path: 'u/a.jpg',
      p_chat_photo_path: 'u/b.jpg',
    });
  });

  it('un testo vuoto parte come null', async () => {
    respondWith([{ post_id: 'p9', visible_from: 'a', expires_at: 'b' }]);
    await createPost({ caption: '   ' });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('create_post', {
      p_caption: null,
      p_photo_path: null,
      p_chat_photo_path: null,
    });
  });

  it.each(['NO_RECENT_DECLARATION', 'INVALID_POST', 'INVALID_PHOTO_PATH'] as const)(
    'propaga %s come errore tipizzato',
    async (code) => {
      respondWith(null, { message: code });
      await expect(createPost({ caption: 'x' })).rejects.toEqual(new RpcError(code));
    },
  );
});

describe('fetchFeedPage', () => {
  it('prima pagina: nessun cursore', async () => {
    respondWith([postRow()]);
    await expect(fetchFeedPage()).resolves.toEqual([feedPost]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_feed', {
      p_before_visible: null,
      p_before_id: null,
      p_limit: 20,
    });
  });

  it('le pagine successive passano il cursore composto, con la precisione del server', async () => {
    respondWith([]);
    await fetchFeedPage({ beforeVisible: '2026-11-09T05:00:00.123456+00:00', beforeId: 'p1' });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_feed', {
      p_before_visible: '2026-11-09T05:00:00.123456+00:00',
      p_before_id: 'p1',
      p_limit: 20,
    });
  });

  it('accetta un post senza locale né testo', async () => {
    respondWith([postRow({ venue_name: null, night_date: null, caption: null, has_photo: false })]);
    const [post] = await fetchFeedPage();
    expect(post).toMatchObject({
      venueName: null,
      nightDate: null,
      caption: null,
      hasPhoto: false,
    });
  });

  it('rifiuta una risposta con forma inattesa', async () => {
    respondWith([{ post_id: 'p1' }]);
    await expect(fetchFeedPage()).rejects.toThrow();
  });
});

describe('fetchStoryPosts', () => {
  it('chiede i post di una persona', async () => {
    respondWith([postRow()]);
    await expect(fetchStoryPosts('u1')).resolves.toEqual([feedPost]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_story_posts', { p_user_id: 'u1' });
  });
});

describe('setPostLike', () => {
  it('imposta il like e restituisce il contatore del server', async () => {
    respondWith([{ like_count: 5, liked_by_me: true }]);
    await expect(setPostLike('p1', true)).resolves.toEqual({ likeCount: 5, likedByMe: true });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_post_like', {
      p_post_id: 'p1',
      p_liked: true,
    });
  });

  it('POST_NOT_FOUND è un errore tipizzato', async () => {
    respondWith(null, { message: 'POST_NOT_FOUND' });
    await expect(setPostLike('p1', true)).rejects.toEqual(new RpcError('POST_NOT_FOUND'));
  });
});

describe('commenti', () => {
  const commentRow = {
    comment_id: 'c1',
    user_id: 'u2',
    handle: 'gatto.blu',
    text: 'bella',
    created_at: '2026-11-09T10:00:00Z',
    is_mine: false,
    can_delete: true,
  };

  it('fetchComments converte le righe e passa il cursore', async () => {
    respondWith([commentRow]);
    await expect(fetchComments('p1', '2026-11-09T11:00:00Z')).resolves.toEqual([
      {
        id: 'c1',
        userId: 'u2',
        handle: 'gatto.blu',
        text: 'bella',
        createdAt: '2026-11-09T10:00:00Z',
        isMine: false,
        canDelete: true,
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_post_comments', {
      p_post_id: 'p1',
      p_before: '2026-11-09T11:00:00Z',
      p_limit: 30,
    });
  });

  it('addComment restituisce id e data', async () => {
    respondWith([{ comment_id: 'c9', created_at: '2026-11-09T12:00:00Z' }]);
    await expect(addComment('p1', 'ciao')).resolves.toEqual({
      id: 'c9',
      createdAt: '2026-11-09T12:00:00Z',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('add_post_comment', {
      p_post_id: 'p1',
      p_text: 'ciao',
    });
  });

  it('INVALID_COMMENT è un errore tipizzato', async () => {
    respondWith(null, { message: 'INVALID_COMMENT' });
    await expect(addComment('p1', '')).rejects.toEqual(new RpcError('INVALID_COMMENT'));
  });

  it('deleteComment e deletePost chiamano le RPC giuste', async () => {
    respondWith(null);
    await deleteComment('c1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('delete_post_comment', { p_comment_id: 'c1' });
    respondWith(null);
    await deletePost('p1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('delete_post', { p_post_id: 'p1' });
  });
});

describe('moderazione', () => {
  it('segnala un post e un commento con il tipo giusto', async () => {
    respondWith(null);
    await reportPost('p1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('report', {
      p_target_kind: 'post',
      p_target_id: 'p1',
      p_reason: null,
    });
    respondWith(null);
    await reportComment('c1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('report', {
      p_target_kind: 'comment',
      p_target_id: 'c1',
      p_reason: null,
    });
  });
});

describe('fetchPostPhotoUrls', () => {
  it('senza id non chiama la rete', async () => {
    await expect(fetchPostPhotoUrls([])).resolves.toEqual({});
    expect(fakeSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('chiede gli URL firmati all’Edge Function', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({
      data: { urls: [{ postId: 'p1', url: 'https://signed.test/p1' }] },
      error: null,
    });
    await expect(fetchPostPhotoUrls(['p1'])).resolves.toEqual({ p1: 'https://signed.test/p1' });
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('post-photo-urls', {
      body: { postIds: ['p1'] },
    });
  });

  it('un errore dell’Edge Function diventa un errore tipizzato', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(fetchPostPhotoUrls(['p1'])).rejects.toBeInstanceOf(RpcError);
  });
});
