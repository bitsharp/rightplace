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

import { regenerateHandle, setHandle } from './api';
import { myProfileKey } from './hooks';

// My @tag is printed on my posts, comments and chat messages: those copies must show the new one.
const HANDLE_DEPENDENT_KEYS = [
  FEED_KEY,
  STORIES_KEY,
  STORY_POSTS_ROOT_KEY,
  POST_COMMENTS_ROOT_KEY,
  CHAT_MESSAGES_ROOT_KEY,
] as const;

function useHandleChange() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return async (change: () => Promise<string>): Promise<RpcErrorCode | null> => {
    try {
      await change();
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

// Draws another @animale.colore (at most once every 30 days, enforced by the server).
export function useRegenerateHandle() {
  const run = useHandleChange();
  return () => run(regenerateHandle);
}

// Claims the @tag the user typed; the server validates, checks the blocklist and the 30-day limit.
export function useSetHandle() {
  const run = useHandleChange();
  return (handle: string) => run(() => setHandle(handle));
}
