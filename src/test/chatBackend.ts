import { seedFriendsBackend, type FakeUser } from './friendsBackend';

// Stand-in for the chat RPCs (the real rules live in SQL and pgTAP). To prove the client defends
// itself too, get_room_messages here returns EVERY message of the room, strangers' included.
export type FakeMessage = {
  id: string;
  user_id: string;
  handle: string;
  kind?: 'text' | 'photo';
  text?: string | null;
  created_at: string;
  is_mine?: boolean;
};

export type FakeRoom = {
  room_id: string;
  venue_id: string;
  venue_name: string;
  event_id?: string | null;
  event_name?: string | null;
  expires_at?: string;
  friends_inside?: number;
  photo_count?: number;
};

type Options = {
  rooms: FakeRoom[];
  messages?: FakeMessage[];
  users?: FakeUser[];
  accepted?: string[];
};

const roomRow = (room: FakeRoom, messages: FakeMessage[]) => {
  const last = messages[0];
  return {
    event_id: null,
    event_name: null,
    expires_at: '2099-01-01T00:00:00Z',
    friends_inside: 1,
    photo_count: 0,
    last_kind: last ? (last.kind ?? 'text') : null,
    last_text: last?.text ?? null,
    last_handle: last?.handle ?? null,
    last_at: last?.created_at ?? null,
    ...room,
  };
};

const messageRow = ({ id, ...message }: FakeMessage) => ({
  message_id: id,
  kind: 'text',
  text: null,
  is_mine: false,
  ...message,
});

export function seedChatBackend(options: Options) {
  const messages = [...(options.messages ?? [])];
  const sent: { text: string | null; photoPath: string | null }[] = [];
  const newestFirst = () => [...messages].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  seedFriendsBackend(
    { users: options.users ?? [], accepted: options.accepted },
    {
      get_my_chat_rooms: () => options.rooms.map((room) => roomRow(room, newestFirst())),
      get_room_messages: () => newestFirst().map(messageRow),
      send_chat_message: (args: unknown) => {
        const { p_text, p_photo_path } = args as {
          p_text: string | null;
          p_photo_path: string | null;
        };
        sent.push({ text: p_text, photoPath: p_photo_path });
        const id = `sent-${sent.length}`;
        const created = new Date().toISOString();
        messages.push({
          id,
          user_id: 'user-1',
          handle: 'lince.rosso',
          kind: p_photo_path ? 'photo' : 'text',
          text: p_text,
          created_at: created,
          is_mine: true,
        });
        return [{ message_id: id, created_at: created }];
      },
    },
  );
  return { messages, sent };
}
