export const POST_TARGET_KEY = ['postTarget'] as const;
export const FEED_KEY = ['feed'] as const;
export const STORIES_KEY = ['stories'] as const;
export const STORY_POSTS_ROOT_KEY = ['storyPosts'] as const;
export const storyPostsKey = (userId: string) => [...STORY_POSTS_ROOT_KEY, userId] as const;
export const POST_COMMENTS_ROOT_KEY = ['postComments'] as const;
export const commentsKey = (postId: string) => [...POST_COMMENTS_ROOT_KEY, postId] as const;
export const postPhotoUrlsKey = (postIds: string[]) => ['postPhotoUrls', ...postIds] as const;
