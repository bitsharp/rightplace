import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';

export type FollowState = 'none' | 'pending' | 'accepted';

const rowSchema = z.object({
  handle: z.string(),
  age_band: z.enum(['18-24', '25-34', '35-44', '45+']).nullable(),
  gender: z.enum(['female', 'male', 'other']).nullable(),
  is_creator: z.boolean(),
  // null = the caller may not see them (neither me nor an accepted follower): never a made-up zero
  followers_count: z.number().int().nullable(),
  following_count: z.number().int().nullable(),
  posts_count: z.number().int().nullable(),
  is_me: z.boolean(),
  follow_state: z.enum(['none', 'pending', 'accepted']),
});

// Public identity only (principle 1) plus counters the server releases to me and to accepted followers (principle 6).
export type ProfileSummary = {
  handle: string;
  ageBand: '18-24' | '25-34' | '35-44' | '45+' | null;
  gender: 'female' | 'male' | 'other' | null;
  isCreator: boolean;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  isMe: boolean;
  followState: FollowState;
};

// null when the person does not exist for me (blocked in either direction, or a deleted profile).
export async function fetchProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const rows = z
    .array(rowSchema)
    .parse(await callRpc<unknown>('get_profile_summary', { p_user_id: userId }));
  const [row] = rows;
  if (!row) return null;
  return {
    handle: row.handle,
    ageBand: row.age_band,
    gender: row.gender,
    isCreator: row.is_creator,
    followersCount: row.followers_count,
    followingCount: row.following_count,
    postsCount: row.posts_count,
    isMe: row.is_me,
    followState: row.follow_state,
  };
}
