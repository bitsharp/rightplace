export const CHAT_ROOMS_KEY = ['chatRooms'] as const;
export const CHAT_MESSAGES_ROOT_KEY = ['chatMessages'] as const;
export const roomMessagesKey = (roomId: string) => [...CHAT_MESSAGES_ROOT_KEY, roomId] as const;
export const chatPhotoUrlsKey = (roomId: string, messageIds: string[]) =>
  ['chatPhotoUrls', roomId, ...messageIds] as const;
