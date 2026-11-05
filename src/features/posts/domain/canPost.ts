import type { PostTarget } from './types';

// The rule itself (a declaration that is active or ended less than 24 h ago) lives in get_post_target.
export const canPost = (target: PostTarget | null | undefined): boolean => target != null;
