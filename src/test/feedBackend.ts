import { seedFriendsBackend, type FakeUser } from './friendsBackend';

// Stand-in for the post RPCs (the real rules live in SQL and pgTAP): it keeps likes, comments and
// created posts so UI flows can be exercised end to end. Like the friends fake, it is naive on purpose:
// get_feed returns EVERY post it was given, so a test can prove the client never invents visibility.
export type FakePost = {
  post_id: string;
  author_id: string;
  author_handle: string;
  venue_name?: string | null;
  night_date?: string | null;
  caption?: string | null;
  has_photo?: boolean;
  visible_from?: string;
  expires_at?: string;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
  is_mine?: boolean;
};

export type FakeComment = {
  comment_id: string;
  user_id: string;
  handle: string;
  text: string;
  created_at: string;
  is_mine?: boolean;
  can_delete?: boolean;
};

type Options = {
  posts?: FakePost[];
  stories?: { user_id: string; handle: string; latest_post_at: string }[];
  storyPosts?: Record<string, FakePost[]>;
  target?: { room_id?: string | null; venue_name?: string } | null;
  comments?: FakeComment[];
  users?: FakeUser[];
  accepted?: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const postRow = (post: FakePost) => ({
  venue_name: 'Arena Club',
  night_date: '2026-11-08',
  caption: null,
  has_photo: false,
  visible_from: new Date(Date.now() - 3_600_000).toISOString(),
  expires_at: new Date(Date.now() + 6.5 * DAY_MS).toISOString(),
  like_count: 0,
  comment_count: 0,
  liked_by_me: false,
  is_mine: false,
  ...post,
});

const commentRow = (comment: FakeComment) => ({ is_mine: false, can_delete: false, ...comment });

export function seedFeedBackend(options: Options = {}) {
  const posts = (options.posts ?? []).map(postRow);
  const comments = [...(options.comments ?? [])];
  const created: {
    caption: string | null;
    photoPath: string | null;
    chatPhotoPath: string | null;
  }[] = [];
  const findPost = (args: unknown) =>
    posts.find((p) => p.post_id === (args as { p_post_id: string }).p_post_id);
  seedFriendsBackend(
    { users: options.users ?? [], accepted: options.accepted },
    {
      get_feed: () => posts,
      get_stories: options.stories ?? [],
      get_story_posts: (args: unknown) =>
        (options.storyPosts?.[(args as { p_user_id: string }).p_user_id] ?? []).map(postRow),
      get_post_target: () =>
        options.target
          ? [
              {
                night_id: 'n1',
                event_id: null,
                venue_name: 'Arena Club',
                night_date: '2026-11-08',
                room_id: null,
                ...options.target,
              },
            ]
          : [],
      set_post_like: (args: unknown) => {
        const post = findPost(args);
        const liked = (args as { p_liked: boolean }).p_liked;
        if (post && post.liked_by_me !== liked) {
          post.liked_by_me = liked;
          post.like_count += liked ? 1 : -1;
        }
        return [{ like_count: post?.like_count ?? 0, liked_by_me: liked }];
      },
      get_post_comments: () => comments.map(commentRow),
      add_post_comment: (args: unknown) => {
        const { p_text } = args as { p_text: string };
        const id = `c-new-${comments.length + 1}`;
        const createdAt = new Date().toISOString();
        comments.unshift({
          comment_id: id,
          user_id: 'user-1',
          handle: 'lince.rosso',
          text: p_text,
          created_at: createdAt,
          is_mine: true,
          can_delete: true,
        });
        return [{ comment_id: id, created_at: createdAt }];
      },
      create_post: (args: unknown) => {
        const a = args as {
          p_caption: string | null;
          p_photo_path: string | null;
          p_chat_photo_path: string | null;
        };
        created.push({
          caption: a.p_caption,
          photoPath: a.p_photo_path,
          chatPhotoPath: a.p_chat_photo_path,
        });
        return [
          {
            post_id: 'p-new',
            visible_from: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * DAY_MS).toISOString(),
          },
        ];
      },
    },
  );
  return { posts, comments, created };
}
