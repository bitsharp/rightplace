import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const NOTIFICATION_STORE_KEY = 'rightplace.notifications';
export const MAX_TRACKED_ROOMS = 50;
const MAX_TRACKED_NIGHTS = 14;

type State = {
  // "Seen" and "read" markers are local conveniences: only ids and timestamps, never content.
  activitySeenAt: string | null;
  chatLastReadAt: Record<string, string>;
  // Nights for which "how was last night?" is no longer needed (a post was published).
  postedNights: string[];
  // Last time our own permission question was shown (epoch ms): at most once a week.
  permissionAskedAt: number | null;
  // Needed at sign-out to unregister this device from the account.
  pushToken: string | null;
  markActivitySeen: (at: string) => void;
  markRoomRead: (roomId: string, at: string) => void;
  markNightPosted: (nightDate: string) => void;
  setPermissionAskedAt: (at: number) => void;
  setPushToken: (token: string | null) => void;
};

const initialState = () => ({
  activitySeenAt: null,
  chatLastReadAt: {},
  postedNights: [],
  permissionAskedAt: null,
  pushToken: null,
});

function keepNewestRooms(rooms: Record<string, string>): Record<string, string> {
  const newest = Object.entries(rooms)
    .sort(([, a], [, b]) => (a < b ? 1 : a > b ? -1 : 0))
    .slice(0, MAX_TRACKED_ROOMS);
  return Object.fromEntries(newest);
}

export const useNotificationStore = create<State>()(
  persist(
    (set) => ({
      ...initialState(),
      markActivitySeen: (at) => set({ activitySeenAt: at }),
      markRoomRead: (roomId, at) =>
        set((state) => {
          const previous = state.chatLastReadAt[roomId];
          if (previous !== undefined && previous >= at) return state;
          return { chatLastReadAt: keepNewestRooms({ ...state.chatLastReadAt, [roomId]: at }) };
        }),
      markNightPosted: (nightDate) =>
        set((state) =>
          state.postedNights.includes(nightDate)
            ? state
            : { postedNights: [...state.postedNights, nightDate].slice(-MAX_TRACKED_NIGHTS) },
        ),
      setPermissionAskedAt: (at) => set({ permissionAskedAt: at }),
      setPushToken: (token) => set({ pushToken: token }),
    }),
    {
      name: NOTIFICATION_STORE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        activitySeenAt,
        chatLastReadAt,
        postedNights,
        permissionAskedAt,
        pushToken,
      }) => ({ activitySeenAt, chatLastReadAt, postedNights, permissionAskedAt, pushToken }),
    },
  ),
);

export function resetNotificationState(): void {
  useNotificationStore.setState(initialState());
}
