type RoomSummary = { roomId: string; lastAt: string | null; lastHandle: string | null };

// Rooms whose last VISIBLE message is someone else's and newer than my local "last read".
// Visibility is already decided by the server (get_my_chat_rooms), so strangers never count.
export function unreadRooms(
  rooms: readonly RoomSummary[],
  lastReadAt: Readonly<Record<string, string>>,
  myHandle: string,
): number {
  return rooms.filter((room) => {
    if (room.lastAt === null || room.lastHandle === null || room.lastHandle === myHandle) {
      return false;
    }
    const readAt = lastReadAt[room.roomId];
    return readAt === undefined || room.lastAt > readAt;
  }).length;
}

export function unseenActivity(
  activity: readonly { createdAt: string }[],
  seenAt: string | null,
): number {
  return activity.filter((item) => seenAt === null || item.createdAt > seenAt).length;
}
