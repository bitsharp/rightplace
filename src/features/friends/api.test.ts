import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  acceptFollow,
  blockUser,
  cancelFollowRequest,
  clearMyPhoneHash,
  declineFollow,
  fetchBlockedUsers,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRequests,
  fetchFollowRequestsCount,
  matchContacts,
  removeFollower,
  reportUser,
  requestFollow,
  searchUsers,
  setMyPhoneHash,
  unblockUser,
  unfollow,
} from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const person = {
  user_id: 'u1',
  handle: 'volpe.viola',
  age_band: '18-24',
  gender: 'female',
  is_creator: false,
};

const lastCall = () => fakeSupabase.rpc.mock.calls.at(-1);

describe('searchUsers', () => {
  it('chiama search_users e converte la riga', async () => {
    respondWith([
      {
        ...person,
        follow_state: 'accepted',
        follows_me: true,
        tonight_venue_id: 'v1',
        tonight_venue_name: 'Arena Club',
      },
    ]);
    expect(await searchUsers('volpe')).toEqual([
      {
        userId: 'u1',
        handle: 'volpe.viola',
        ageBand: '18-24',
        gender: 'female',
        isCreator: false,
        followState: 'accepted',
        followsMe: true,
        tonightVenueId: 'v1',
        tonightVenueName: 'Arena Club',
      },
    ]);
    expect(lastCall()).toEqual(['search_users', { p_query: 'volpe' }]);
  });

  it('rifiuta una risposta con uno stato di follow sconosciuto', async () => {
    respondWith([
      {
        ...person,
        follow_state: 'blocked',
        follows_me: false,
        tonight_venue_id: null,
        tonight_venue_name: null,
      },
    ]);
    await expect(searchUsers('volpe')).rejects.toThrow();
  });

  it('propaga gli errori del server come RpcError', async () => {
    respondWith(null, { message: 'NOT_AUTHENTICATED' });
    await expect(searchUsers('volpe')).rejects.toBeInstanceOf(RpcError);
  });
});

describe('liste', () => {
  it('fetchFollowing converte seguiti e locale di stasera', async () => {
    respondWith([
      {
        ...person,
        follows_me: false,
        tonight_venue_id: null,
        tonight_venue_name: null,
        followed_at: '2026-11-01T10:00:00Z',
      },
    ]);
    const [first] = await fetchFollowing();
    expect(first).toMatchObject({
      handle: 'volpe.viola',
      followsMe: false,
      tonightVenueName: null,
    });
    expect(lastCall()?.[0]).toBe('get_following');
  });

  it('fetchFollowers converte i follower', async () => {
    respondWith([{ ...person, i_follow: true, followed_at: '2026-11-01T10:00:00Z' }]);
    expect(await fetchFollowers()).toEqual([
      expect.objectContaining({ userId: 'u1', iFollow: true }),
    ]);
    expect(lastCall()?.[0]).toBe('get_followers');
  });

  it('fetchBlockedUsers converte i bloccati', async () => {
    respondWith([{ user_id: 'u9', handle: 'lupo.verde', blocked_at: '2026-11-02T10:00:00Z' }]);
    expect(await fetchBlockedUsers()).toEqual([
      { userId: 'u9', handle: 'lupo.verde', blockedAt: '2026-11-02T10:00:00Z' },
    ]);
  });

  it('fetchFollowRequests converte le richieste', async () => {
    respondWith([{ ...person, requested_at: '2026-11-03T10:00:00Z' }]);
    expect(await fetchFollowRequests()).toEqual([
      expect.objectContaining({ userId: 'u1', requestedAt: '2026-11-03T10:00:00Z' }),
    ]);
    expect(lastCall()?.[0]).toBe('get_follow_requests');
  });

  it('fetchFollowRequestsCount restituisce il numero', async () => {
    respondWith(3);
    expect(await fetchFollowRequestsCount()).toBe(3);
    expect(lastCall()?.[0]).toBe('count_follow_requests');
  });
});

describe('azioni sui follow', () => {
  it.each([
    ['requestFollow', requestFollow, 'request_follow', { p_user_id: 'u1' }],
    ['cancelFollowRequest', cancelFollowRequest, 'cancel_follow_request', { p_user_id: 'u1' }],
    ['acceptFollow', acceptFollow, 'accept_follow', { p_follower_id: 'u1' }],
    ['declineFollow', declineFollow, 'decline_follow', { p_follower_id: 'u1' }],
    ['unfollow', unfollow, 'unfollow', { p_user_id: 'u1' }],
    ['removeFollower', removeFollower, 'remove_follower', { p_follower_id: 'u1' }],
    ['blockUser', blockUser, 'block_user', { p_user_id: 'u1' }],
    ['unblockUser', unblockUser, 'unblock_user', { p_user_id: 'u1' }],
  ])('%s chiama %s con gli argomenti giusti', async (_label, action, rpc, args) => {
    await action('u1');
    expect(lastCall()).toEqual([rpc, args]);
  });

  it('requestFollow propaga BLOCKED', async () => {
    respondWith(null, { message: 'BLOCKED' });
    await expect(requestFollow('u1')).rejects.toMatchObject({ code: 'BLOCKED' });
  });

  it('reportUser segnala un utente con motivo facoltativo', async () => {
    await reportUser('u1', 'spam');
    expect(lastCall()).toEqual([
      'report',
      { p_target_kind: 'user', p_target_id: 'u1', p_reason: 'spam' },
    ]);
  });

  it('reportUser senza motivo non lo inventa', async () => {
    await reportUser('u1');
    expect(lastCall()?.[1]).toEqual({ p_target_kind: 'user', p_target_id: 'u1', p_reason: null });
  });
});

describe('contatti', () => {
  it('matchContacts invia solo gli hash e converte i profili pubblici', async () => {
    const hash = 'a'.repeat(64);
    respondWith([person]);
    expect(await matchContacts([hash])).toEqual([
      { userId: 'u1', handle: 'volpe.viola', ageBand: '18-24', gender: 'female', isCreator: false },
    ]);
    expect(lastCall()).toEqual(['match_contacts', { p_hashes: [hash] }]);
  });

  it('matchContacts propaga CONTACTS_OPT_OUT', async () => {
    respondWith(null, { message: 'CONTACTS_OPT_OUT' });
    await expect(matchContacts(['a'.repeat(64)])).rejects.toMatchObject({
      code: 'CONTACTS_OPT_OUT',
    });
  });

  it('setMyPhoneHash e clearMyPhoneHash chiamano le RPC dedicate', async () => {
    await setMyPhoneHash('b'.repeat(64));
    expect(lastCall()).toEqual(['set_my_phone_hash', { p_hash: 'b'.repeat(64) }]);
    await clearMyPhoneHash();
    expect(lastCall()?.[0]).toBe('clear_my_phone_hash');
  });
});
