import { useTranslation } from 'react-i18next';

import { PostCard } from '@/components/app/PostCard';

import { expiresInDays } from '../domain/expiry';
import { postMetaText } from '../domain/postMeta';
import type { FeedPost } from '../domain/types';

type Props = {
  post: FeedPost;
  photoUri?: string;
  onToggleLike: (post: FeedPost) => void;
  onOpenComments: (postId: string) => void;
  onLongPress: (post: FeedPost) => void;
};

// Maps a server post to the presentational card. The photo shows a placeholder until its signed URL arrives.
export function FeedPostItem({ post, photoUri, onToggleLike, onOpenComments, onLongPress }: Props) {
  const { t } = useTranslation('feed');
  const now = new Date();
  return (
    <PostCard
      handle={post.authorHandle}
      meta={postMetaText(t, post, now)}
      tone={post.isMine ? 'neutral' : 'going'}
      daysLeft={expiresInDays(post.expiresAt, now)}
      caption={post.caption ?? undefined}
      photoUri={photoUri}
      photoCacheKey={post.id}
      scene={post.id.charCodeAt(0)}
      likeCount={post.likeCount}
      liked={post.likedByMe}
      commentCount={post.commentCount}
      onToggleLike={() => onToggleLike(post)}
      onOpenComments={() => onOpenComments(post.id)}
      onLongPress={() => onLongPress(post)}
    />
  );
}
