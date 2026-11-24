import { useLocalSearchParams } from 'expo-router';

import { PostScreen } from '@/features/posts/screens/PostScreen';

// `post/new` is a static route and wins over this dynamic one: "new" is never read as a post id.
export default function PostRoute() {
  const { id, comments, comment } = useLocalSearchParams<{
    id: string;
    comments?: string;
    comment?: string;
  }>();
  return (
    <PostScreen
      postId={id ?? ''}
      openComments={comments === '1'}
      highlightCommentId={comment ?? null}
    />
  );
}
