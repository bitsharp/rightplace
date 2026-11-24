export const AVATAR_URLS_ROOT_KEY = ['avatarUrls'] as const;
export const avatarUrlsKey = (userIds: readonly string[]) =>
  [...AVATAR_URLS_ROOT_KEY, ...userIds] as const;
// One entry per person (url, or null when the server signed nothing for me): every list on every screen
// finds a URL already fetched by another one instead of asking again. Memory only (see hooks).
export const AVATAR_USER_ROOT_KEY = [...AVATAR_URLS_ROOT_KEY, 'user'] as const;
export const avatarUserKey = (userId: string) => [...AVATAR_USER_ROOT_KEY, userId] as const;
