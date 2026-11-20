import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, spacing } from '@/theme/tokens';

import type { FeedPost } from '../domain/types';

const COLUMNS = 3;
const GAP = 2;
// The screen has 20 px of side padding on each side (spacing.xl).
const SIDE_PADDING = spacing.xl * 2;

type Props = {
  posts: FeedPost[];
  photoUrls: Record<string, string>;
  // Avatar, counters and buttons: the grid is the list, the profile header is its first element.
  header: ReactElement;
  // What to show under the header when there are no posts (empty state, or the "private profile" lock).
  empty: ReactElement;
  onOpenPost: (post: FeedPost) => void;
  onLongPressPost: (post: FeedPost) => void;
  onLoadMore: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

// Three square tiles per row: a photo post shows its thumbnail, a text-only post its caption.
export function PostGrid({
  posts,
  photoUrls,
  header,
  empty,
  onOpenPost,
  onLongPressPost,
  onLoadMore,
  refreshing,
  onRefresh,
}: Props) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - SIDE_PADDING - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <FlatList
      testID="post-grid"
      data={posts}
      numColumns={COLUMNS}
      keyExtractor={(post) => post.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.6}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <Tile
          post={item}
          size={size}
          photoUri={photoUrls[item.id]}
          onOpen={onOpenPost}
          onLongPress={onLongPressPost}
        />
      )}
    />
  );
}

type TileProps = {
  post: FeedPost;
  size: number;
  photoUri?: string;
  onOpen: (post: FeedPost) => void;
  onLongPress: (post: FeedPost) => void;
};

function Tile({ post, size, photoUri, onOpen, onLongPress }: TileProps) {
  const { t } = useTranslation('feed');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('grid.open', { handle: formatHandle(post.authorHandle) })}
      onPress={() => onOpen(post)}
      onLongPress={() => onLongPress(post)}
      style={{ width: size, height: size }}
    >
      {post.hasPhoto ? (
        <PhotoFrame
          height={size}
          uri={photoUri}
          scene={post.id.charCodeAt(0)}
          accessibilityLabel={post.caption ?? undefined}
          cacheKey={post.id}
        />
      ) : (
        <View style={[styles.textTile, { width: size, height: size }]}>
          <Text variant="body12" numberOfLines={6}>
            {post.caption ?? ''}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: GAP },
  row: { gap: GAP },
  textTile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
  },
});
