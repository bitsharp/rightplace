import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { fetchProfileSummary } from './api';

const row = (overrides: Record<string, unknown> = {}) => ({
  handle: 'volpe.viola',
  age_band: '25-34',
  gender: 'female',
  is_creator: false,
  followers_count: 12,
  following_count: 30,
  posts_count: 3,
  is_me: false,
  follow_state: 'accepted',
  ...overrides,
});

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

describe('fetchProfileSummary', () => {
  it('restituisce identità pubblica, conteggi e stato del follow', async () => {
    respondWith([row()]);
    await expect(fetchProfileSummary('u1')).resolves.toEqual({
      handle: 'volpe.viola',
      ageBand: '25-34',
      gender: 'female',
      isCreator: false,
      followersCount: 12,
      followingCount: 30,
      postsCount: 3,
      isMe: false,
      followState: 'accepted',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_profile_summary', { p_user_id: 'u1' });
  });

  it('per chi non ha il permesso i conteggi restano null (mai inventati a zero)', async () => {
    respondWith([
      row({
        followers_count: null,
        following_count: null,
        posts_count: null,
        follow_state: 'none',
      }),
    ]);
    await expect(fetchProfileSummary('u1')).resolves.toMatchObject({
      followersCount: null,
      followingCount: null,
      postsCount: null,
      followState: 'none',
    });
  });

  it('senza righe (bloccato o profilo cancellato) il profilo non esiste', async () => {
    respondWith([]);
    await expect(fetchProfileSummary('u1')).resolves.toBeNull();
  });

  it('un errore del server diventa un errore tipizzato', async () => {
    respondWith(null, { message: 'NOT_AUTHENTICATED' });
    await expect(fetchProfileSummary('u1')).rejects.toEqual(new RpcError('NOT_AUTHENTICATED'));
  });
});
