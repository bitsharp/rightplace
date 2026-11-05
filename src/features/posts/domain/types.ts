export type FeedPost = {
  id: string;
  authorId: string;
  authorHandle: string;
  venueName: string | null;
  // Date the night started (YYYY-MM-DD, city calendar); null if the venue/night was removed.
  nightDate: string | null;
  caption: string | null;
  hasPhoto: boolean;
  // Kept as the server wrote it (microseconds): it is the keyset cursor, a Date would lose precision.
  visibleFrom: string;
  expiresAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

export type PostTarget = {
  nightId: string | null;
  eventId: string | null;
  venueName: string;
  nightDate: string | null;
  roomId: string | null;
};

export type PostComment = {
  id: string;
  userId: string;
  handle: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  canDelete: boolean;
};

export type FeedCursor = { beforeVisible: string; beforeId: string };
