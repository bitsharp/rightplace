import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';

import type { FollowStatus } from './domain/followButton';

export type AgeBand = '18-24' | '25-34' | '35-44' | '45+';
export type Gender = 'female' | 'male' | 'other';

// Public identity only (principle 1): never email, exact age, location or contacts.
export type Person = {
  userId: string;
  handle: string;
  ageBand: AgeBand;
  gender: Gender;
  isCreator: boolean;
};

export type SearchResult = Person & {
  followState: FollowStatus;
  followsMe: boolean;
  tonightVenueId: string | null;
  tonightVenueName: string | null;
};

export type Following = Person & {
  followsMe: boolean;
  tonightVenueId: string | null;
  tonightVenueName: string | null;
  followedAt: string;
};

export type Follower = Person & { iFollow: boolean; followedAt: string };
export type FollowRequest = Person & { requestedAt: string };
export type BlockedUser = { userId: string; handle: string; blockedAt: string };

const personSchema = z.object({
  user_id: z.string(),
  handle: z.string(),
  age_band: z.enum(['18-24', '25-34', '35-44', '45+']),
  gender: z.enum(['female', 'male', 'other']),
  is_creator: z.boolean(),
});

type PersonRow = z.infer<typeof personSchema>;

const toPerson = (row: PersonRow): Person => ({
  userId: row.user_id,
  handle: row.handle,
  ageBand: row.age_band,
  gender: row.gender,
  isCreator: row.is_creator,
});

const venueColumns = {
  tonight_venue_id: z.string().nullable(),
  tonight_venue_name: z.string().nullable(),
};

const searchSchema = personSchema.extend({
  follow_state: z.enum(['none', 'pending', 'accepted']),
  follows_me: z.boolean(),
  ...venueColumns,
});
const followingSchema = personSchema.extend({
  follows_me: z.boolean(),
  followed_at: z.string(),
  ...venueColumns,
});
const followerSchema = personSchema.extend({ i_follow: z.boolean(), followed_at: z.string() });
const requestSchema = personSchema.extend({ requested_at: z.string() });
const blockedSchema = z.object({ user_id: z.string(), handle: z.string(), blocked_at: z.string() });

// Where someone goes tonight comes back only for accepted follows: the server decides (principle 6).
export async function searchUsers(query: string): Promise<SearchResult[]> {
  const rows = z
    .array(searchSchema)
    .parse(await callRpc<unknown>('search_users', { p_query: query }));
  return rows.map((row) => ({
    ...toPerson(row),
    followState: row.follow_state,
    followsMe: row.follows_me,
    tonightVenueId: row.tonight_venue_id,
    tonightVenueName: row.tonight_venue_name,
  }));
}

export async function fetchFollowing(): Promise<Following[]> {
  const rows = z.array(followingSchema).parse(await callRpc<unknown>('get_following'));
  return rows.map((row) => ({
    ...toPerson(row),
    followsMe: row.follows_me,
    tonightVenueId: row.tonight_venue_id,
    tonightVenueName: row.tonight_venue_name,
    followedAt: row.followed_at,
  }));
}

export async function fetchFollowers(): Promise<Follower[]> {
  const rows = z.array(followerSchema).parse(await callRpc<unknown>('get_followers'));
  return rows.map((row) => ({
    ...toPerson(row),
    iFollow: row.i_follow,
    followedAt: row.followed_at,
  }));
}

export async function fetchFollowRequests(): Promise<FollowRequest[]> {
  const rows = z.array(requestSchema).parse(await callRpc<unknown>('get_follow_requests'));
  return rows.map((row) => ({ ...toPerson(row), requestedAt: row.requested_at }));
}

export async function fetchFollowRequestsCount(): Promise<number> {
  return z
    .number()
    .int()
    .parse(await callRpc<unknown>('count_follow_requests'));
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const rows = z.array(blockedSchema).parse(await callRpc<unknown>('get_blocked_users'));
  return rows.map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    blockedAt: row.blocked_at,
  }));
}

async function callWithUser(name: string, argument: string, userId: string): Promise<void> {
  await callRpc<unknown>(name, { [argument]: userId });
}

export const requestFollow = (userId: string) =>
  callWithUser('request_follow', 'p_user_id', userId);
export const cancelFollowRequest = (userId: string) =>
  callWithUser('cancel_follow_request', 'p_user_id', userId);
export const unfollow = (userId: string) => callWithUser('unfollow', 'p_user_id', userId);
export const blockUser = (userId: string) => callWithUser('block_user', 'p_user_id', userId);
export const unblockUser = (userId: string) => callWithUser('unblock_user', 'p_user_id', userId);
export const acceptFollow = (followerId: string) =>
  callWithUser('accept_follow', 'p_follower_id', followerId);
export const declineFollow = (followerId: string) =>
  callWithUser('decline_follow', 'p_follower_id', followerId);
export const removeFollower = (followerId: string) =>
  callWithUser('remove_follower', 'p_follower_id', followerId);

export async function reportUser(userId: string, reason?: string): Promise<void> {
  await callRpc<unknown>('report', {
    p_target_kind: 'user',
    p_target_id: userId,
    p_reason: reason ?? null,
  });
}

// Only SHA-256 hashes cross the network, never numbers or names (principle 4).
export async function matchContacts(hashes: string[]): Promise<Person[]> {
  const rows = z
    .array(personSchema)
    .parse(await callRpc<unknown>('match_contacts', { p_hashes: hashes }));
  return rows.map(toPerson);
}

export async function setMyPhoneHash(hash: string): Promise<void> {
  await callRpc<unknown>('set_my_phone_hash', { p_hash: hash });
}

export async function clearMyPhoneHash(): Promise<void> {
  await callRpc<unknown>('clear_my_phone_hash');
}
