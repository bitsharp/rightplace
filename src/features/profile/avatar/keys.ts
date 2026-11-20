export const AVATAR_URLS_ROOT_KEY = ['avatarUrls'] as const;
export const avatarUrlsKey = (userIds: readonly string[]) =>
  [...AVATAR_URLS_ROOT_KEY, ...userIds] as const;
