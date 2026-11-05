import { setFakeRpc } from './fakeSupabase';

// Stand-in for the server side of the friends RPCs (the real rules live in SQL and pgTAP):
// it keeps follow state, requests and blocks so UI flows can be exercised end to end.
export type FakeUser = {
  id: string;
  handle: string;
  age_band?: string;
  gender?: string;
  venue?: string;
};

type FollowState = 'none' | 'pending' | 'accepted';

type Options = {
  users: FakeUser[];
  accepted?: string[];
  requests?: string[];
  followers?: string[];
  blocked?: string[];
  contactMatches?: string[];
};

type World = {
  users: FakeUser[];
  follow: Map<string, FollowState>;
  requests: Set<string>;
  followers: Set<string>;
  blocked: Set<string>;
  reports: { id: string; reason: string | null }[];
};

type Args = Record<string, string>;
const argOf = (args: unknown, name: string): string => (args as Args)[name] ?? '';

const person = (user: FakeUser) => ({
  user_id: user.id,
  handle: user.handle,
  age_band: user.age_band ?? '18-24',
  gender: user.gender ?? 'female',
  is_creator: false,
});

const visible = (world: World, ids: Iterable<string>) =>
  world.users.filter((user) => [...ids].includes(user.id) && !world.blocked.has(user.id));

function searchRpcs(world: World) {
  const stateOf = (id: string): FollowState => world.follow.get(id) ?? 'none';
  return {
    search_users: (args: unknown) =>
      world.users
        .filter(
          (user) => !world.blocked.has(user.id) && user.handle.includes(argOf(args, 'p_query')),
        )
        .map((user) => {
          const accepted = stateOf(user.id) === 'accepted';
          return {
            ...person(user),
            follow_state: stateOf(user.id),
            follows_me: world.followers.has(user.id),
            tonight_venue_id: accepted && user.venue ? 'v1' : null,
            tonight_venue_name: accepted ? (user.venue ?? null) : null,
          };
        }),
    request_follow: (args: unknown) => {
      world.follow.set(argOf(args, 'p_user_id'), 'pending');
      return 'pending';
    },
    cancel_follow_request: (args: unknown) => world.follow.delete(argOf(args, 'p_user_id')),
    unfollow: (args: unknown) => world.follow.delete(argOf(args, 'p_user_id')),
  };
}

function listRpcs(world: World) {
  const accepted = () => [...world.follow].filter(([, s]) => s === 'accepted').map(([id]) => id);
  return {
    get_following: () =>
      visible(world, accepted()).map((user) => ({
        ...person(user),
        follows_me: world.followers.has(user.id),
        tonight_venue_id: user.venue ? 'v1' : null,
        tonight_venue_name: user.venue ?? null,
        followed_at: '2026-11-01T10:00:00Z',
      })),
    get_followers: () =>
      visible(world, world.followers).map((user) => ({
        ...person(user),
        i_follow: world.follow.get(user.id) === 'accepted',
        followed_at: '2026-11-01T10:00:00Z',
      })),
    get_follow_requests: () =>
      visible(world, world.requests).map((user) => ({
        ...person(user),
        requested_at: '2026-11-03T10:00:00Z',
      })),
    count_follow_requests: () => visible(world, world.requests).length,
    get_blocked_users: () =>
      world.users
        .filter((user) => world.blocked.has(user.id))
        .map((user) => ({
          user_id: user.id,
          handle: user.handle,
          blocked_at: '2026-11-02T10:00:00Z',
        })),
  };
}

function answerRpcs(world: World) {
  return {
    accept_follow: (args: unknown) => {
      const id = argOf(args, 'p_follower_id');
      world.requests.delete(id);
      world.followers.add(id);
    },
    decline_follow: (args: unknown) => world.requests.delete(argOf(args, 'p_follower_id')),
    remove_follower: (args: unknown) => world.followers.delete(argOf(args, 'p_follower_id')),
    block_user: (args: unknown) => {
      const id = argOf(args, 'p_user_id');
      world.blocked.add(id);
      world.follow.delete(id);
      world.followers.delete(id);
    },
    unblock_user: (args: unknown) => world.blocked.delete(argOf(args, 'p_user_id')),
    report: (args: unknown) => {
      const { p_reason } = args as { p_reason?: string | null };
      world.reports.push({ id: argOf(args, 'p_target_id'), reason: p_reason ?? null });
    },
  };
}

export function seedFriendsBackend(options: Options) {
  const world: World = {
    users: options.users,
    follow: new Map((options.accepted ?? []).map((id) => [id, 'accepted' as const])),
    requests: new Set(options.requests ?? []),
    followers: new Set(options.followers ?? []),
    blocked: new Set(options.blocked ?? []),
    reports: [],
  };
  setFakeRpc({
    ...searchRpcs(world),
    ...listRpcs(world),
    ...answerRpcs(world),
    match_contacts: () => visible(world, options.contactMatches ?? []).map(person),
    set_my_phone_hash: null,
    clear_my_phone_hash: null,
    get_stories: [],
    get_my_declaration: [],
  });
  return world;
}
