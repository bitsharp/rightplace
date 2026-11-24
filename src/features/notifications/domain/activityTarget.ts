import type { ActivityKind } from '../api';

type Target = {
  kind: ActivityKind;
  actorHandle: string;
  postId: string | null;
  commentId: string | null;
};

// Where a row of "Novità" leads. A like opens the post (its author sees who liked it); a comment opens the post with
// the comments sheet on that comment. Follow requests live inside the Friends tab.
export function activityRoute(item: Target): string {
  switch (item.kind) {
    case 'like':
      return item.postId ? `/post/${item.postId}` : '/feed';
    case 'comment':
      if (!item.postId) return '/feed';
      return `/post/${item.postId}?comments=1${item.commentId ? `&comment=${item.commentId}` : ''}`;
    case 'follow_request':
      return '/friends';
    case 'follow_accepted':
      return `/u/${item.actorHandle}`;
  }
}
