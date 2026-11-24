export const DM_THREADS_KEY = ['dmThreads'] as const;
export const DM_UNREAD_KEY = ['dmUnread'] as const;
export const DM_MESSAGES_ROOT_KEY = ['dmMessages'] as const;
export const dmMessagesKey = (threadId: string) => [...DM_MESSAGES_ROOT_KEY, threadId] as const;
