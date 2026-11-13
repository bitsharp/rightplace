import { useQueryClient } from '@tanstack/react-query';

import { CHAT_MESSAGES_ROOT_KEY } from '@/features/chat/keys';
import { useSession } from '@/features/auth/useSession';
import { invalidateKeys } from '@/features/friends/keys';
import {
  FEED_KEY,
  POST_COMMENTS_ROOT_KEY,
  STORIES_KEY,
  STORY_POSTS_ROOT_KEY,
} from '@/features/posts/keys';
import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { regenerateHandle } from './api';
import { myProfileKey } from './hooks';

// My @tag is printed on my posts, comments and chat messages: those copies must show the new one.
const HANDLE_DEPENDENT_KEYS = [
  FEED_KEY,
  STORIES_KEY,
  STORY_POSTS_ROOT_KEY,
  POST_COMMENTS_ROOT_KEY,
  CHAT_MESSAGES_ROOT_KEY,
] as const;

// Draws another @animale.colore (allowed once, enforced by the server).
export function useRegenerateHandle() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return async (): Promise<RpcErrorCode | null> => {
    try {
      await regenerateHandle();
      await invalidateKeys(queryClient, [
        myProfileKey(userId ?? undefined),
        ...HANDLE_DEPENDENT_KEYS,
      ]);
      return null;
    } catch (error) {
      return error instanceof RpcError ? error.code : 'UNKNOWN';
    }
  };
}
